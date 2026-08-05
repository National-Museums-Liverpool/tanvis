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
const columns = [
  { title: 'Scientific name', field: 'scientificName', formatter: 'html' },
  { title: 'Common name', field: 'commonName', responsive: 9 },
  { title: 'First record date', field: 'firstRecordDate' },
  { title: 'Group', field: 'taxonGroup', responsive: 10 },
  { title: 'Species ID', field: 'speciesId', responsive: 10 },
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
      const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
      element.__tanvisNewSpeciesLoadId = loadId;
      element.dataset.visArea = renderConfig.area;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;
      element.dataset.visTaxonGroupLabelMode = getEffectiveLabelMode(renderConfig);
      const pageSize = DEFAULT_PAGE_SIZE;

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
            createNewSpeciesTableAdapter().render(element, {
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
      const summary = createSummary(startDate, endDate, 0);
      element.appendChild(summary);

      const { container } = createTableContainer({
        Tabulator,
        pageSize,
        requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
          const pageResult = await buildNewSpeciesRecordsPage({
            apiBase,
            startDate,
            endDate,
            higherGeographyIdentifier,
            taxonGroupExternalKey,
            pageNumber,
            pageSize: requestedPageSize,
            labelMode: getEffectiveLabelMode(renderConfig)
          });

          if (element.__tanvisNewSpeciesLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          updateSummary(summary, startDate, endDate, pageResult.totalRows);
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
  const rows = Array.isArray(table?.getData?.())
    ? table.getData()
    : Array.isArray(element.__tanvisLatestRows)
      ? element.__tanvisLatestRows
      : [];

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

function createSummary(startDate, endDate, count) {
  const summary = document.createElement('p');
  summary.textContent = `${count} new species between ${startDate} and ${endDate}`;
  return summary;
}

function updateSummary(summary, startDate, endDate, count) {
  if (summary) {
    summary.textContent = `${count} new species between ${startDate} and ${endDate}`;
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

async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('first_record_date[gte]', startDate);
  pageUrl.searchParams.set('first_record_date[lte]', endDate);
  pageUrl.searchParams.set('include', 'taxon,taxon-group');
  const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
  pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
  if (taxonGroupExternalKey) {
    pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
  }
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

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}