import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { normalizeAreaValue, resolveAreaSelectionKey } from './map/common.js';
import { parseTaxonGroupDisplayNames } from '../utils/taxonGroupLabels.js';

const TAXON_STATS_RESOURCE = 'taxon-stats';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_TOP_N = 50;
const columns = [
  
  { title: 'Scientific', field: 'scientificName', formatter: 'html', headerSort: false },
  { title: 'Vernacular', field: 'commonName', headerSort: false , responsive: 8 },
  { title: 'Rarity', field: 'rarityCategory', headerSort: false },
  { title: 'Records', field: 'totalRecords', headerSort: false },
  { title: 'Tetrads', field: 'occupiedGridSquares', headerSort: false },
  { title: 'Trend', field: 'frequencyTrendScore', headerSort: false },
  { title: 'Group', field: 'taxonGroup', headerSort: false, responsive: 10 },
  { title: 'TVK', field: 'speciesId', headerSort: false , responsive: 10 }
];

export function createIncreasingSpeciesTableAdapter() {
  return {
    name: 'increasing-species-table',
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

      const topN = parseTopN(renderConfig.topN) ?? DEFAULT_TOP_N;
      const apiBase = resolveApiBase();
      const higherGeographyIdentifier = areaToHigherGeographyIdentifier(renderConfig.area);
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const loadId = (element.__tanvisIncreasingLoadId || 0) + 1;
      element.__tanvisIncreasingLoadId = loadId;
      element.dataset.visArea = renderConfig.area;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;
      element.dataset.visTaxonGroupLabelMode = getEffectiveLabelMode(renderConfig);
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

            element.dataset.visArea = resolveAreaSelectionKey(nextArea);
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createIncreasingSpeciesTableAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
            return;
          }

          if (event.type === 'name-language-change') {
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
      const summary = createSummary(topN, 0);
      element.appendChild(summary);

      const { container } = createTableContainer({
        Tabulator,
        pageSize,
        requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
          const pageResult = await buildIncreasingSpeciesRecordsPage({
            apiBase,
            topN,
            higherGeographyIdentifier,
            taxonGroupExternalKey,
            pageNumber,
            pageSize: requestedPageSize,
            labelMode: getEffectiveLabelModeForElement(element, renderConfig)
          });

          if (element.__tanvisIncreasingLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          updateSummary(summary, topN, pageResult.totalRows);
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

function createSummary(topN, count) {
  const summary = document.createElement('p');
  summary.textContent = `Top ${topN} species by frequency trend`;
  return summary;
}

function updateSummary(summary, topN, count) {
  if (summary) {
    summary.textContent = `Top ${topN} species by frequency trend`;
  }
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
    initialSort: [
      { column: 'frequencyTrendScore', dir: 'desc' }
    ],
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
        if (element.__tanvisIncreasingLoadId === loadId) {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render increasing species table'));
        }
        throw error;
      }
    }
  });

  if (table && typeof table.on === 'function') {
    table.on('rowClick', function (e, row) {
      const rowData = row.getData();
      const speciesId = rowData.speciesId;

      const rowSelectedEvent = new CustomEvent('species-row-selected', {
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

function parseTopN(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}

async function buildIncreasingSpeciesRecordsPage({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize, labelMode = 'scientific' }) {
  const effectiveTopN = Math.max(0, Math.floor(topN ?? DEFAULT_TOP_N));
  const effectivePageSize = Math.max(1, Math.floor(pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (pageNumber - 1) * effectivePageSize;
  const totalRows = effectiveTopN;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));

  if (offset >= effectiveTopN) {
    return {
      records: [],
      totalRows,
      totalPages
    };
  }

  const limit = Math.min(effectivePageSize, Math.max(1, effectiveTopN - offset));
  const payload = await fetchTaxonStats({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset });
  const taxonStatsRows = getListData(payload);
  const rankedRows = taxonStatsRows.slice(0, effectiveTopN - offset);

  return {
    records: rankedRows.map((row) => {
      return {
        speciesId: row.taxon_identifier,
        vcNumber: row.geographic_region_identifier,
        rarityCategory: row.taxon__rarity_category || '',
        firstRecordDate: row.first_record_date,
        totalRecords: row.occurrences_count,
        occupiedGridSquares: row.grid_square_count,
        frequencyTrendScore: row.frequency_trend,
        scientificName: `<i>${row.taxon__scientific_name || ''}</i>`,
        commonName: formatVernacularName(row),
        taxonGroup: formatGroupName({ title: row.taxon_group__title, friendly: row.taxon_group__friendly }, labelMode),
        taxonGroupTitle: row.taxon_group__title,
        taxonGroupFriendly: row.taxon_group__friendly
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

async function fetchTaxonStats({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('include', 'taxon, taxon-group');
  const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
  pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
  if (taxonGroupExternalKey) {
    pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
  }
  // Once the API exposes frequency_trend in taxon-stats responses, switch this to sort=frequency_trend.
  pageUrl.searchParams.set('sort', '-occurrences_count');
  pageUrl.searchParams.set('limit', String(limit));
  pageUrl.searchParams.set('offset', String(offset));

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
  const plural = taxon?.vernacular_names;
  if (Array.isArray(plural)) {
    return plural.join(', ');
  }

  return taxon?.taxon__vernacular_name || '';
}

function areaToHigherGeographyIdentifier(area) {
  const normalizedArea = normalizeAreaValue(area);

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
    return normalizeAreaValue(config.area);
  }

  if (typeof document === 'undefined') {
    return normalizeAreaValue(config.area);
  }

  const controlElement = document.getElementById(config.control);
  const controlAreaValue = controlElement?.dataset?.visArea;
  const normalizedControlAreaValue = normalizeAreaValue(controlAreaValue);
  if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
    return normalizedControlAreaValue;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
    return normalizeAreaValue(latestEvent.area);
  }

  return normalizeAreaValue(config.area);
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

  if (!config.control || typeof document === 'undefined') {
    return 'scientific';
  }

  const controlElement = document.getElementById(config.control);
  return controlElement?.dataset?.visTaxonGroupLabelMode || 'scientific';
}

function getEffectiveLabelModeForElement(element, config) {
  return element?.dataset?.visTaxonGroupLabelMode || getEffectiveLabelMode(config);
}