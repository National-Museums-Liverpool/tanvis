import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { resolveRegionSelectionKey } from './map/common.js';
import { normalizeRegionContractValue } from '../controls/regionControls.js';
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

      const effectiveRegion = getEffectiveRegion(config);
      const renderConfig = effectiveRegion === config.region
        ? config
        : {
            ...config,
            region: effectiveRegion
          };

      const topN = parseTopN(renderConfig.topN) ?? DEFAULT_TOP_N;
      const apiBase = resolveApiBase();
      const higherGeographyIdentifier = regionToHigherGeographyIdentifier(renderConfig.region);
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const effectiveLabelMode = getEffectiveLabelMode(renderConfig);
      const loadId = (element.__tanvisIncreasingLoadId || 0) + 1;
      element.__tanvisIncreasingLoadId = loadId;
      element.dataset.visRegion = renderConfig.region;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;
      element.dataset.visTaxonGroupLabelMode = effectiveLabelMode;
      const pageSize = getConfiguredPageSize(renderConfig);

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (!event) {
            return;
          }

          if (event.type === 'region-change' || event.type === 'taxon-group-change') {
            const nextRegion = getEffectiveRegion(renderConfig);
            const nextTaxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);

            if (nextRegion === element.dataset.visRegion && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
              return;
            }

            element.dataset.visRegion = nextRegion === '' ? '' : String(nextRegion);
            element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
            createIncreasingSpeciesTableAdapter().render(element, {
              ...renderConfig,
              region: nextRegion
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
      const summary = createSummary(topN, 0, renderConfig.region);
      element.appendChild(summary);
      element.__tanvisSummaryElement = summary;
      element.__tanvisSummaryState = { topN, region: renderConfig.region, taxonGroupInfo: null };

      if (taxonGroupExternalKey) {
        resolveTaxonGroupInfo(apiBase, taxonGroupExternalKey).then((taxonGroupInfo) => {
          if (element.__tanvisIncreasingLoadId !== loadId || !element.__tanvisSummaryState) {
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
          const pageResult = await buildIncreasingSpeciesRecordsPage({
            apiBase,
            topN,
            higherGeographyIdentifier,
            taxonGroupExternalKey,
            pageNumber,
            pageSize: requestedPageSize,
            labelMode: labelModeForRequest
          });

          if (element.__tanvisIncreasingLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          element.__tanvisSummaryState.topN = topN;
          element.__tanvisSummaryState.region = renderConfig.region;
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

function createSummary(topN, count, region, taxonGroupName) {
  const summary = document.createElement('div');
  summary.classList.add('tanvis-table-header-text');
  summary.textContent = buildSummaryText(topN, region, taxonGroupName);
  return summary;
}

function buildSummaryText(topN, region, taxonGroupName) {
  const suffix = taxonGroupName ? ` for taxon group ${taxonGroupName}` : '';
  return `Top ${topN} species by frequency trend for ${formatTableRegionLabel(region)}${suffix}`;
}

function refreshSummary(element, labelMode) {
  const state = element.__tanvisSummaryState;
  const summary = element.__tanvisSummaryElement;
  if (!state || !summary) {
    return;
  }

  const taxonGroupName = state.taxonGroupInfo ? formatGroupName(state.taxonGroupInfo, labelMode) : '';
  summary.textContent = buildSummaryText(state.topN, state.region, taxonGroupName);
}

function formatTableRegionLabel(region) {
  const normalizedRegion = normalizeRegionContractValue(region);
  if (normalizedRegion === undefined || normalizedRegion === null || normalizedRegion === '' || normalizedRegion === 'all' || normalizedRegion === 'vc-all' || normalizedRegion === 'all VCs') {
    return 'all VCs';
  }

  if (typeof normalizedRegion === 'number') {
    return `vc${normalizedRegion}`;
  }

  const candidate = String(normalizedRegion).trim().toLowerCase();
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

async function fetchTaxonStats({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('include', 'taxon, taxon-group, taxon-rank');
  const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
  pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
  if (taxonGroupExternalKey) {
    pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
  }
  pageUrl.searchParams.set('taxon_rank__rank[eq]', 'Species');
  pageUrl.searchParams.set('sort', '-frequency_trend');
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

function regionToHigherGeographyIdentifier(region) {
  const normalizedRegion = normalizeRegionContractValue(region);

  if (normalizedRegion === 58) {
    return 58;
  }

  if (normalizedRegion === 59) {
    return 59;
  }

  if (normalizedRegion === 60) {
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

function getEffectiveRegion(config) {
  if (!config.control) {
    return normalizeRegionContractValue(config.region);
  }

  if (typeof document === 'undefined') {
    return normalizeRegionContractValue(config.region);
  }

  const controlElement = document.getElementById(config.control);
  const controlRegionValue = controlElement?.dataset?.visRegion;
  const normalizedControlRegionValue = normalizeRegionContractValue(controlRegionValue);
  if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visRegion') && normalizedControlRegionValue !== undefined && normalizedControlRegionValue !== null && normalizedControlRegionValue !== '') {
    return normalizedControlRegionValue;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'region-change' && latestEvent.region !== undefined && latestEvent.region !== null) {
    return normalizeRegionContractValue(latestEvent.region);
  }

  return normalizeRegionContractValue(config.region);
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