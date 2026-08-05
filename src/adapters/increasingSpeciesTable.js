import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { normalizeAreaValue, resolveAreaSelectionKey } from './map/common.js';

const TAXON_STATS_RESOURCE = 'taxon-stats';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_TOP_N = 50;
const columns = [
  { title: 'Species ID', field: 'speciesId', sorter: 'string' },
  { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
  { title: 'Common name', field: 'commonName', sorter: 'string' },
  { title: 'Rarity category', field: 'rarityCategory', sorter: 'string' },
  { title: 'Total records', field: 'totalRecords', sorter: 'number' },
  { title: 'Occupied grid squares', field: 'occupiedGridSquares', sorter: 'number' },
  { title: 'Frequency trend', field: 'frequencyTrendScore', sorter: 'number' }
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
      const pageSize = DEFAULT_PAGE_SIZE;

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
            return;
          }

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
            pageSize: requestedPageSize
          });

          if (element.__tanvisIncreasingLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          updateSummary(summary, topN, pageResult.totalRows);
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

function createSummary(topN, count) {
  const summary = document.createElement('p');
  summary.textContent = `${count} species returned (top ${topN} by frequency trend)`;
  return summary;
}

function updateSummary(summary, topN, count) {
  if (summary) {
    summary.textContent = `${count} species returned (top ${topN} by frequency trend)`;
  }
}

function createTableContainer({ Tabulator, pageSize, requestPage, element, loadId, status }) {
  const container = document.createElement('div');
  element.appendChild(container);

  const table = new Tabulator(container, {
    columns,
    layout: 'fitColumns',
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

async function buildIncreasingSpeciesRecordsPage({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize }) {
  const offset = (pageNumber - 1) * pageSize;
  const payload = await fetchTaxonStats({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit: pageSize, offset });
  const taxonStatsRows = getListData(payload);
  const totalRows = getTotalCount(payload);
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const rankedRows = taxonStatsRows.slice(0, topN);

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
        scientificName: row.taxon__scientific_name || '',
        commonName: formatVernacularName(row)
      };
    }),
    totalRows,
    totalPages
  };
}

async function fetchTaxonStats({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('include', 'taxon, taxon-group');
  console.log('higherGeographyIdentifier', higherGeographyIdentifier);
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

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area) {
    return normalizeAreaValue(latestEvent.area);
  }

  if (typeof document === 'undefined') {
    return normalizeAreaValue(config.area);
  }

  const controlElement = document.getElementById(config.control);
  const controlArea = controlElement?.dataset?.visArea;
  return normalizeAreaValue(controlArea ?? config.area);
}

function getEffectiveTaxonGroup(config) {
  if (!config.control || typeof document === 'undefined') {
    return '';
  }

  const controlElement = document.getElementById(config.control);
  return controlElement?.dataset?.visTaxonGroup || '';
}