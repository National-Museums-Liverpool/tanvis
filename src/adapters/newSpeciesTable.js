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
  { title: 'Vernacular', field: 'commonName', headerSort: false , responsive: 8 },
  { title: 'Verified', field: 'verifiedStatus', headerSort: false, 
    formatter: "tickCross", hozAlign: "center", formatterParams: {
      allowTruthy: true,     // Allows any non-empty/truthy value to show a tick
      crossElement: false,   // Disables the red cross symbol entirely
      allowEmpty: true       // Keeps empty strings, null, and undefined blank
    }
  },
  { title: 'First record', field: 'firstRecordDate', headerSort: false  },
  { title: 'Group', field: 'taxonGroup', headerSort: false , responsive: 9 },
  { title: 'TVK', field: 'speciesId', headerSort: false , responsive: 10 },
];

export function createNewSpeciesTableAdapter() {
  return {
    name: 'new-species-table',
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

      const startDate = renderConfig.startDate;
      const endDate = renderConfig.endDate || getCurrentIsoDate();
      const apiBase = resolveApiBase();
      const higherGeographyIdentifier = areaToHigherGeographyIdentifier(renderConfig.area);
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const effectiveLabelMode = getEffectiveLabelMode(renderConfig);
      const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
      element.__tanvisNewSpeciesLoadId = loadId;
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
            createNewSpeciesTableAdapter().render(element, {
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
            refreshSummary(element, nextLabelMode);
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
      const summary = createSummary(startDate, endDate, 0, renderConfig.area);
      element.appendChild(summary);
      element.__tanvisSummaryElement = summary;
      element.__tanvisSummaryState = { startDate, endDate, area: renderConfig.area, count: 0, taxonGroupInfo: null };

      if (taxonGroupExternalKey) {
        resolveTaxonGroupInfo(apiBase, taxonGroupExternalKey).then((taxonGroupInfo) => {
          if (element.__tanvisNewSpeciesLoadId !== loadId || !element.__tanvisSummaryState) {
            return;
          }

          element.__tanvisSummaryState.taxonGroupInfo = taxonGroupInfo;
          refreshSummary(element, getEffectiveLabelModeForElement(element, renderConfig));
        });
      }

      const { container } = createTableContainer({
        Tabulator,
        pageSize,
        requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
          const labelModeForRequest = getEffectiveLabelModeForElement(element, renderConfig);
          const pageResult = await buildNewSpeciesRecordsPage({
            apiBase,
            startDate,
            endDate,
            higherGeographyIdentifier,
            taxonGroupExternalKey,
            pageNumber,
            pageSize: requestedPageSize,
            labelMode: labelModeForRequest
          });

          if (element.__tanvisNewSpeciesLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          element.__tanvisSummaryState.startDate = startDate;
          element.__tanvisSummaryState.endDate = endDate;
          element.__tanvisSummaryState.area = renderConfig.area;
          element.__tanvisSummaryState.count = pageResult.totalRows;
          refreshSummary(element, labelModeForRequest);
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
    : (Array.isArray(element.__tanvisLatestRows)
      ? element.__tanvisLatestRows
      : []);

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

function createSummary(startDate, endDate, count, area, taxonGroupName) {
  const summary = document.createElement('div');
  summary.classList.add('tanvis-table-header-text');
  summary.textContent = buildSummaryText(startDate, endDate, count, area, taxonGroupName);
  return summary;
}

function buildSummaryText(startDate, endDate, count, area, taxonGroupName) {
  const suffix = taxonGroupName ? ` for taxon group ${taxonGroupName}` : '';
  return `${count} new species between ${startDate} and ${endDate} for ${formatTableAreaLabel(area)}${suffix}`;
}

function refreshSummary(element, labelMode) {
  const state = element.__tanvisSummaryState;
  const summary = element.__tanvisSummaryElement;
  if (!state || !summary) {
    return;
  }

  const taxonGroupName = state.taxonGroupInfo ? formatGroupName(state.taxonGroupInfo, labelMode) : '';
  summary.textContent = buildSummaryText(state.startDate, state.endDate, state.count, state.area, taxonGroupName);
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
        if (element.__tanvisNewSpeciesLoadId === loadId) {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render new species table'));
        }
        throw error;
      }
    }
  });

  if (table && typeof table.on === 'function') {
    table.on('rowClick', function (e, row) {
      const rowData = row.getData();
      const speciesId = rowData.speciesId;

      const rowSelectedEvent = new CustomEvent('taxon-identified', {
        detail: { speciesId },
        bubbles: true,
        cancelable: true
      });

      container.dispatchEvent(rowSelectedEvent);
    });

  }

  container.dataset.tanvisTableContainer = 'true';
  container.__tanvisTable = table;
  return { container, table };
}

function getCurrentIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function buildNewSpeciesRecordsPage({ apiBase, startDate, endDate, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize, labelMode = 'scientific' }) {
  const offset = (pageNumber - 1) * pageSize;
  const payload = await fetchTaxonStatsInRange({
    apiBase,
    startDate,
    endDate,
    higherGeographyIdentifier,
    taxonGroupExternalKey,
    limit: pageSize,
    offset
  });

  //console.log('Fetched verified dates:', payload.data.map((row) => row.first_verified_record_date));

  const rows = getListData(payload);
  const totalRows = getTotalCount(payload);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return {
    records: rows.map((row) => {
      return {
        speciesId: row.taxon_identifier,
        scientificName: `<i>${row.taxon__scientific_name}</i>`,
        commonName: row.taxon__vernacular_name || '',
        firstRecordDate: row.first_record_date,
        taxonGroup: formatGroupName({title: row.taxon_group__title, friendly: row.taxon_group__friendly}, labelMode),
        taxonGroupTitle: row.taxon_group__title,
        taxonGroupFriendly: row.taxon_group__friendly,
        verifiedStatus: row.first_verified_record_date
      };
    }),
    totalRows,
    totalPages
  };
}

function formatGroupName(group, labelMode = 'scientific') {
  const parsedNames = parseTaxonGroupDisplayNames(group);
  const displayName = labelMode === 'vernacular'
    ? (parsedNames.vernacularName || parsedNames.scientificName)
    : (parsedNames.scientificName || parsedNames.vernacularName);
  return displayName;
}

const taxonGroupsByApiBase = new Map();

// Resolved independently of table rows so the name is available even when a query returns no records.
async function resolveTaxonGroupInfo(apiBase, taxonGroupExternalKey) {
  if (!taxonGroupExternalKey) {
    return null;
  }

  if (!taxonGroupsByApiBase.has(apiBase)) {
    taxonGroupsByApiBase.set(apiBase, fetchTaxonGroupsMap(apiBase));
  }

  const groupsMap = await taxonGroupsByApiBase.get(apiBase);
  return groupsMap.get(taxonGroupExternalKey) || null;
}

async function fetchTaxonGroupsMap(apiBase) {
  try {
    const resourceUrl = resolveResourceUrl(apiBase, 'taxon-groups');
    const payload = await fetchJson(resourceUrl.toString(), 'Failed to load taxon groups');
    const groups = getListData(payload);
    const map = new Map();
    for (const group of groups) {
      if (group?.external_key) {
        map.set(group.external_key, { title: group.title, friendly: group.friendly });
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('first_record_date[gte]', startDate);
  pageUrl.searchParams.set('first_record_date[lte]', endDate);
  pageUrl.searchParams.set('include', 'taxon,taxon-group,taxon-rank');
  const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
  pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
  if (taxonGroupExternalKey) {
    pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
  }
  pageUrl.searchParams.set('taxon_rank__rank[eq]', 'Species');
  pageUrl.searchParams.set('limit', String(limit));
  pageUrl.searchParams.set('offset', String(offset));
  pageUrl.searchParams.set('sort', '-first_record_date');

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

function getConfiguredPageSize(config) {
  const configuredPageSize = Number(config?.pageSize ?? config?.['data-vis-page-size'] ?? config?.['data-visPageSize'] ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(configuredPageSize) || configuredPageSize <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return configuredPageSize;
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