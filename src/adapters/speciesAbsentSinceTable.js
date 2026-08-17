import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveAreaSelectionKey } from './map/common.js';
import { normalizeAreaContractValue } from '../controls/areaControls.js';
import { parseTaxonGroupDisplayNames } from '../utils/taxonGroupLabels.js';

const TAXON_STATS_RESOURCE = 'taxon-stats';
const DEFAULT_PAGE_SIZE = 10;
const columns = [
  { title: 'Scientific', field: 'scientificName', formatter: 'html', headerSort: false },
  { title: 'Vernacular', field: 'commonName', headerSort: false, responsive: 9 },
  { title: 'Last record', field: 'lastRecordDate', headerSort: false },
  { title: 'Group', field: 'taxonGroup', headerSort: false, responsive: 9 },
  { title: 'TVK', field: 'speciesId', headerSort: false }
];

export function createSpeciesAbsentSinceAdapter() {
  return {
    name: 'species-absent-since',
    render(element, config) {
      clearControlSubscription(element);
      const status = createVisStatusReporter(element);
      clearElement(element);
      status.showInfo('Loading...');

      const effectiveArea = getEffectiveArea(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };

      const year = Number(renderConfig.year);
      const apiBase = resolveApiBase();
      const higherGeographyIdentifier = areaToHigherGeographyIdentifier(renderConfig.area);
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const effectiveLabelMode = getEffectiveLabelMode(renderConfig);
      const loadId = (element.__tanvisSpeciesAbsentLoadId || 0) + 1;
      element.__tanvisSpeciesAbsentLoadId = loadId;
      element.dataset.visArea = renderConfig.area;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;
      element.dataset.visTaxonGroupLabelMode = effectiveLabelMode;
      const pageSize = getConfiguredPageSize(renderConfig);

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (!event) {
            return;
          }

          if (event.type === 'area-change' || event.type === 'taxon-group-change') {
            const nextArea = getEffectiveArea(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);

            if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
              return;
            }

            element.dataset.visArea = nextArea === '' ? '' : String(nextArea);
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createSpeciesAbsentSinceAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
            return;
          }

          if (event.type === 'language-change') {
            const nextLabelMode = getEffectiveLabelMode(renderConfig, event.labelMode);
            if (nextLabelMode === element.dataset.visTaxonGroupLabelMode) {
              return;
            }

            element.dataset.visTaxonGroupLabelMode = nextLabelMode;
            rerenderTableRows(element, { labelMode: nextLabelMode });
          }
        });
      }

      const Tabulator = getTabulatorGlobal();

      if (!Tabulator) {
        clearElement(element);
        status.showError('Tabulator is not available. Include the Tabulator script before Tanvis.');
        return;
      }

      clearElement(element);
      const summary = createSummary(year, 0, renderConfig.area);
      element.appendChild(summary);

      const { container } = createTableContainer({
        Tabulator,
        pageSize,
        requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
          const pageResult = await buildSpeciesAbsentSinceRecordsPage({
            apiBase,
            year,
            higherGeographyIdentifier,
            taxonGroupExternalKey,
            pageNumber,
            pageSize: requestedPageSize,
            labelMode: getEffectiveLabelModeForElement(element, renderConfig)
          });

          if (element.__tanvisSpeciesAbsentLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          updateSummary(summary, year, pageResult.totalRows, renderConfig.area);
          element.__tanvisLatestRows = pageResult.records;
          return {
            data: pageResult.records,
            last_page: pageResult.totalPages,
            last_row: pageResult.totalRows
          };
        },
        element,
        loadId,
        status
      });

      const hasStylesheet = ensureStylesheetDependency(status, {
        libraryName: 'Tabulator',
        stylesheetHints: ['tabulator.min.css'],
        message: 'Tabulator stylesheet is missing. Include tabulator.min.css to ensure the table is styled correctly.'
      });

      if (hasStylesheet) {
        status.clear();
      }

    }
  };
}

function rerenderTableRows(element, { labelMode }) {
  const tableContainer = element?.querySelector('[data-tanvis-table-container="true"]');
  if (!tableContainer?.__tanvisTable) {
    return;
  }

  const table = tableContainer.__tanvisTable;
  const tableRows = typeof table?.getData === 'function' ? table.getData() : null;
  const rows = Array.isArray(tableRows) && tableRows.length > 0
    ? tableRows
    : (Array.isArray(element.__tanvisLatestRows) ? element.__tanvisLatestRows : []);

  const remappedRows = rows.map((row) => ({
    ...row,
    taxonGroup: formatGroupName({
      title: row?.taxonGroupTitle,
      friendly: row?.taxonGroupFriendly
    }, labelMode)
  }));

  if (typeof table.setData === 'function') {
    table.setData(remappedRows);
  }

  element.__tanvisLatestRows = remappedRows;
}

function createSummary(year, count, area) {
  const summary = document.createElement('div');
  summary.classList.add('tanvis-table-header-text');
  summary.textContent = `${count} species with last record date on or before ${year} for ${formatTableAreaLabel(area)}`;
  return summary;
}

function updateSummary(summary, year, count, area) {
  if (summary) {
    summary.textContent = `${count} species with last record date on or before ${year} for ${formatTableAreaLabel(area)}`;
  }
}

function formatTableAreaLabel(area) {
  const normalizedArea = normalizeAreaContractValue(area);
  if (normalizedArea === undefined || normalizedArea === null || normalizedArea === '' || normalizedArea === 'all' || normalizedArea === 'vc-all' || normalizedArea === 'all VCs') {
    return 'all VCs';
  }

  if (typeof normalizedArea === 'number') {
    return `vc${normalizedArea}`;
  }

  const candidate = String(normalizedArea).trim().toLowerCase();
  if (/^vc\d+$/.test(candidate)) {
    return candidate;
  }

  if (/^\d+$/.test(candidate)) {
    return `vc${candidate}`;
  }

  return candidate;
}

function createTableContainer({ Tabulator, pageSize, requestPage, element, loadId, status }) {
  const container = document.createElement('div');
  element.appendChild(container);

  const table = new Tabulator(container, {
    columns,
    layout: 'fitDataFill',
    responsiveLayout: 'collapse',
    pagination: true,
    paginationMode: 'remote',
    paginationSize: pageSize,
    placeholder: 'No records found',
    ajaxURL: 'custom_handler',
    ajaxURLGenerator: function ajaxURLGenerator(url) {
      return url;
    },
    ajaxRequestFunc: async (url, config, params) => {
      try {
        const pageNumber = Number(params?.page || 1);
        const requestedPageSize = Number(params?.size || pageSize);
        return await requestPage({ pageNumber, pageSize: requestedPageSize });
      } catch (error) {
        if (element.__tanvisSpeciesAbsentLoadId === loadId) {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render species absent since table'));
        }
        throw error;
      }
    }
  });

  table.on('rowClick', (event, row) => {
    const speciesId = row?.getData?.()?.speciesId;
    if (!speciesId) {
      return;
    }

    const rowSelectedEvent = new CustomEvent('taxon-identified', {
      detail: { speciesId },
      bubbles: true,
      cancelable: true
    });

    container.dispatchEvent(rowSelectedEvent);
  });

  container.dataset.tanvisTableContainer = 'true';
  container.__tanvisTable = table;
  return { container, table };
}

async function buildSpeciesAbsentSinceRecordsPage({ apiBase, year, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize, labelMode = 'scientific' }) {
  const cutoffDate = `${year}-12-31`;
  const offset = (pageNumber - 1) * pageSize;
  const payload = await fetchTaxonStatsAbsentSince({
    apiBase,
    cutoffDate,
    higherGeographyIdentifier,
    taxonGroupExternalKey,
    limit: pageSize,
    offset
  });

  const taxonStatsRows = getListData(payload);
  const totalRows = getTotalCount(payload);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return {
    records: taxonStatsRows.map((row) => {
      return {
        speciesId: row.taxon_identifier,
        scientificName: `<i>${row.taxon__scientific_name || ''}</i>`,
        commonName: formatVernacularName(row),
        lastRecordDate: row.last_record_date,
        taxonGroup: formatGroupName({ title: row.taxon_group__title, friendly: row.taxon_group__friendly }, labelMode),
        taxonGroupTitle: row.taxon_group__title,
        taxonGroupFriendly: row.taxon_group__friendly,
        vcNumber: row.geographic_region_identifier
      };
    }),
    totalRows,
    totalPages
  };
}

async function fetchTaxonStatsAbsentSince({ apiBase, cutoffDate, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('last_record_date[lte]', cutoffDate);
  pageUrl.searchParams.set('include', 'taxon,taxon-group,taxon-rank');
  pageUrl.searchParams.set('taxon_rank__rank[eq]', 'Species');
  const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
  pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
  if (taxonGroupExternalKey) {
    pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
  }
  pageUrl.searchParams.set('limit', String(limit));
  pageUrl.searchParams.set('offset', String(offset));
  pageUrl.searchParams.set('sort', '-last_record_date');

  const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-stats');
  return payload || {};
}

function resolveResourceUrl(apiBase, resourceName) {
  const baseUrl = new URL(apiBase, window.location.origin);
  const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  baseUrl.pathname = `${pathname}${resourceName}`;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl;
}

async function fetchJson(url, defaultErrorMessage) {
  logApiRequest(url, { method: 'GET' });

  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw createApiError({ defaultMessage: defaultErrorMessage, cause });
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
  }

  return payload || {};
}

function getListData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  return [];
}

function getTotalCount(payload) {
  if (Number.isFinite(payload?.meta?.total)) {
    return Number(payload.meta.total);
  }

  if (Number.isFinite(payload?.total)) {
    return Number(payload.total);
  }

  if (Number.isFinite(payload?.last_row)) {
    return Number(payload.last_row);
  }

  return getListData(payload).length;
}

function formatVernacularName(taxon) {
  const plural = taxon?.taxon__vernacular_names;
  if (Array.isArray(plural)) {
    return plural.join(', ');
  }

  return taxon?.vernacular_name || '';
}

function formatGroupName(group, labelMode = 'scientific') {
  const parsedNames = parseTaxonGroupDisplayNames(group);
  const displayName = labelMode === 'vernacular'
    ? (parsedNames.vernacularName || parsedNames.scientificName)
    : (parsedNames.scientificName || parsedNames.vernacularName);
  return displayName;
}

function areaToHigherGeographyIdentifier(area) {
  const normalizedArea = normalizeAreaContractValue(area);

  if (normalizedArea === 58) {
    return 58;
  }

  if (normalizedArea === 59) {
    return 59;
  }

  if (normalizedArea === 60) {
    return 60;
  }

  return undefined;
}

function clearControlSubscription(element) {
  const cleanup = element?.__tanvisControlCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisControlCleanup;
}

function getEffectiveArea(config) {
  if (!config.control) {
    return normalizeAreaContractValue(config.area);
  }

  if (typeof document === 'undefined') {
    return normalizeAreaContractValue(config.area);
  }

  const controlElement = document.getElementById(config.control);
  const controlAreaValue = controlElement?.dataset?.visArea;
  const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
  if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
    return normalizedControlAreaValue;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
    return normalizeAreaContractValue(latestEvent.area);
  }

  return normalizeAreaContractValue(config.area);
}

function getConfiguredPageSize(config) {
  const configuredPageSize = Number(config?.pageSize ?? config?.['data-vis-page-size'] ?? config?.['data-visPageSize'] ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(configuredPageSize) || configuredPageSize <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return configuredPageSize;
}

function getEffectiveTaxonGroup(config) {
  if (typeof document === 'undefined') {
    return config?.groupId || '';
  }

  const controlElement = config.control ? document.getElementById(config.control) : null;
  if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visTaxonGroup')) {
    const controlGroupValue = controlElement.dataset.visTaxonGroup || '';
    if (controlGroupValue) {
      return controlGroupValue;
    }
  }

  return config?.groupId || '';
}

function getEffectiveLabelMode(config, fallbackMode) {
  if (fallbackMode) {
    return fallbackMode;
  }

  const explicitControlValue = readControlLanguageValue(config);
  if (explicitControlValue) {
    return explicitControlValue;
  }

  if (config?.language) {
    return config.language;
  }

  return 'scientific';
}

function readControlLanguageValue(config) {
  if (!config.control || typeof document === 'undefined') {
    return '';
  }

  const controlElement = document.getElementById(config.control);
  const controlLanguageValue = controlElement?.dataset?.visTaxonGroupLabelMode || controlElement?.dataset?.visLanguage || '';
  if (controlLanguageValue) {
    return controlLanguageValue;
  }

  return '';
}

function getEffectiveLabelModeForElement(element, config) {
  return element?.dataset?.visTaxonGroupLabelMode || getEffectiveLabelMode(config);
}

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}
