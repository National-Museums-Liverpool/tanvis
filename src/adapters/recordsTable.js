import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { normalizeRegionContractValue } from '../controls/regionControls.js';

const OCCURRENCES_RESOURCE = 'occurrences';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PLACEHOLDER_TEXT = 'No species selected.';

// Update this map to change how occurrence attributes are titled in the table.
const COLUMN_TITLE_OVERRIDES = {
  grid_ref: 'Grid ref',
  grid_ref_2km: 'Tetrad',
  locality: 'Location',
  recorded_by: 'Recorder',
  identified_by: 'Identifier',
  identification_verification_status: 'Verification',
  sex: 'Sex',
  life_stage: 'Stage',
  organism_quantity: 'Quantity',
  higher_geography_identifier: 'VC'
};

export function createRecordsTableAdapter() {
  return {
    name: 'records-table',
    render(element, config) {
      clearControlSubscription(element);
      clearTaxonIdSourceSubscription(element);
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

      const taxonIdentifier = resolveTaxonIdentifier(element, renderConfig);
      const apiBase = resolveApiBase();
      const loadId = (element.__tanvisRecordsTableLoadId || 0) + 1;
      element.__tanvisRecordsTableLoadId = loadId;
      element.dataset.visRegion = normalizeRegionDatasetValue(renderConfig.region);
      element.dataset.visTaxonid = taxonIdentifier;
      const pageSize = getConfiguredPageSize(renderConfig);

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (!event || event.type !== 'region-change') {
            return;
          }

          const nextRegion = getEffectiveRegion(renderConfig);
          if (normalizeRegionDatasetValue(nextRegion) === element.dataset.visRegion) {
            return;
          }

          createRecordsTableAdapter().render(element, {
            ...renderConfig,
            region: nextRegion
          });
        });
      }

      if (renderConfig.taxonIdSource) {
        element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource(
          renderConfig.taxonIdSource,
          (speciesId) => {
            if (!speciesId || (speciesId === element.dataset.visTaxonid && !renderConfig.gridReference)) {
              return;
            }

            createRecordsTableAdapter().render(element, {
              ...renderConfig,
              taxonId: speciesId,
              gridReference: undefined
            });
          },
          ({ taxonId, gridReference }) => {
            createRecordsTableAdapter().render(element, {
              ...renderConfig,
              taxonId,
              gridReference
            });
          }
        );
      }

      if (!taxonIdentifier) {
        clearElement(element);
        status.clear();
        renderPlaceholder(element);
        return;
      }

      const Tabulator = getTabulatorGlobal();

      if (!Tabulator) {
        clearElement(element);
        status.showError('Tabulator is not available. Include the Tabulator script before Tanvis.');
        return;
      }

      clearElement(element);
      const summary = createSummary(taxonIdentifier, 0, renderConfig.region, renderConfig.gridReference);
      element.appendChild(summary);
      element.__tanvisSummaryElement = summary;
      element.__tanvisSummaryState = {
        taxonIdentifier,
        region: renderConfig.region,
        gridReference: renderConfig.gridReference,
        count: 0
      };

      createTableContainer({
        Tabulator,
        pageSize,
        requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
          const pageResult = await buildRecordsTablePage({
            apiBase,
            taxonIdentifier,
            region: renderConfig.region,
            gridReference: renderConfig.gridReference,
            pageNumber,
            pageSize: requestedPageSize
          });

          if (element.__tanvisRecordsTableLoadId !== loadId) {
            return {
              data: [],
              last_page: 1,
              last_row: 0
            };
          }

          element.__tanvisSummaryState.count = pageResult.totalRows;
          refreshSummary(element);
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

function resolveTaxonIdentifier(element, config) {
  const fromConfig = normalizeValue(config?.taxonId);
  if (fromConfig) {
    return fromConfig;
  }

  const fromDataset = normalizeValue(element?.dataset?.visTaxonid);
  if (fromDataset) {
    return fromDataset;
  }
  return '';
}

function normalizeValue(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeRegionDatasetValue(region) {
  if (region === undefined || region === null) {
    return '';
  }

  return String(region);
}

function renderPlaceholder(element) {
  const doc = element?.ownerDocument || document;
  const placeholder = doc.createElement('div');
  placeholder.dataset.tanvisRecordsTable = 'placeholder';
  placeholder.textContent = DEFAULT_PLACEHOLDER_TEXT;
  element.appendChild(placeholder);
}

function createSummary(taxonIdentifier, count, region, gridReference) {
  const summary = document.createElement('div');
  summary.classList.add('tanvis-table-header-text');
  summary.textContent = buildSummaryText(count, region, gridReference);
  return summary;
}

function buildSummaryText(count, region, gridReference) {
  const location = normalizeValue(gridReference) || formatTableRegionLabel(region);
  return `${count} records in ${location}`;
}

function refreshSummary(element) {
  const state = element.__tanvisSummaryState;
  const summary = element.__tanvisSummaryElement;
  if (!state || !summary) {
    return;
  }

  summary.textContent = buildSummaryText(state.count, state.region, state.gridReference);
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

// Columns are not fixed since the table shows whatever attributes the occurrences API returns.
function createTableContainer({ Tabulator, pageSize, requestPage, element, loadId, status }) {
  const container = document.createElement('div');
  element.appendChild(container);

  const table = new Tabulator(container, {
    autoColumns: true,
    autoColumnsDefinitions: (definitions) => {
      definitions.forEach((definition) => {
        definition.headerSort = false;
      });
      definitions.forEach((definition) => {
        const overrideTitle = COLUMN_TITLE_OVERRIDES[definition.field];
        if (overrideTitle) {
          definition.title = overrideTitle;
        }
      });
      return definitions;
    },
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
        if (element.__tanvisRecordsTableLoadId === loadId) {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render records table'));
        }
        throw error;
      }
    }
  });

  container.dataset.tanvisTableContainer = 'true';
  container.__tanvisTable = table;
  return { container, table };
}

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}

async function buildRecordsTablePage({ apiBase, taxonIdentifier, region, gridReference, pageNumber, pageSize }) {
  const effectivePageSize = Math.max(1, Math.floor(pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = Math.max(0, (Math.max(1, Math.floor(pageNumber || 1)) - 1) * effectivePageSize);

  const resourceUrl = resolveResourceUrl(apiBase, OCCURRENCES_RESOURCE);
  const pageUrl = new URL(resourceUrl.toString());
  pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);

  if (region) {
    pageUrl.searchParams.set('higher_geography_identifier[eq]', String(region));
  }

  if (gridReference) {
    pageUrl.searchParams.set('grid_ref_2km[eq]', String(gridReference));
  }

  pageUrl.searchParams.set('sort', '-to_date');
  pageUrl.searchParams.set('limit', String(effectivePageSize));
  pageUrl.searchParams.set('offset', String(offset));

  const payload = await fetchJson(pageUrl.toString(), 'Failed to load occurrences');
  const records = getListData(payload).map(transformRecordForDisplay);
  const totalRows = getTotalCount(payload) || records.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));

  return {
    records,
    totalRows,
    totalPages
  };
}

// Replaces unique_key/taxon_identifier/from_date/to_date with friendlier Source and Date columns.
function transformRecordForDisplay(record) {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const { unique_key, taxon_identifier, from_date, to_date, ...rest } = record;
  const transformed = {};

  if (unique_key !== undefined) {
    transformed.Source = extractSourceFromUniqueKey(unique_key);
  }

  if (from_date !== undefined || to_date !== undefined) {
    transformed.Date = formatDateRange(from_date, to_date);
  }

  return { ...transformed, ...rest };
}

function extractSourceFromUniqueKey(uniqueKey) {
  if (typeof uniqueKey !== 'string') {
    return '';
  }

  const separatorIndex = uniqueKey.indexOf(':');
  return separatorIndex === -1 ? uniqueKey : uniqueKey.slice(0, separatorIndex);
}

function formatDateRange(fromDate, toDate) {
  if (!fromDate) {
    return toDate || '';
  }

  if (!toDate || fromDate === toDate) {
    return fromDate;
  }

  return `${fromDate} to ${toDate}`;
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

function clearControlSubscription(element) {
  const cleanup = element?.__tanvisControlCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisControlCleanup;
}

function clearTaxonIdSourceSubscription(element) {
  const cleanup = element?.__tanvisTaxonIdSourceCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisTaxonIdSourceCleanup;
}

function subscribeToTaxonIdSource(taxonIdSourceId, onSpeciesSelected, onTetradClicked) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
  if (!taxonIdSourceElement) {
    return undefined;
  }

  const onTaxonIdentified = (event) => {
    const speciesId = event?.detail?.speciesId;
    if (typeof speciesId !== 'string' || !speciesId.trim()) {
      return;
    }

    onSpeciesSelected(speciesId.trim());
  };

  const handleTetradClicked = (event) => {
    console.log('Tetrad clicked event received:', event);
    const taxonId = normalizeValue(event?.detail?.taxonId);
    const gridReference = normalizeValue(event?.detail?.gridReference);
    if (!taxonId || !gridReference) {
      return;
    }

    onTetradClicked?.({ taxonId, gridReference });
  };

  taxonIdSourceElement.addEventListener('taxon-identified', onTaxonIdentified);
  taxonIdSourceElement.addEventListener('tetrad-clicked', handleTetradClicked);
  return () => {
    taxonIdSourceElement.removeEventListener('taxon-identified', onTaxonIdentified);
    taxonIdSourceElement.removeEventListener('tetrad-clicked', handleTetradClicked);
  };
}

function getEffectiveRegion(config) {
  if (!config.control || typeof document === 'undefined') {
    return normalizeRegionContractValue(config.region);
  }

  const controlElement = document.getElementById(config.control);
  const controlRegionValue = controlElement?.dataset?.visRegion;
  const normalizedControlRegionValue = normalizeRegionContractValue(controlRegionValue);
  if (
    controlElement
    && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visRegion')
    && normalizedControlRegionValue !== undefined
    && normalizedControlRegionValue !== null
    && normalizedControlRegionValue !== ''
  ) {
    return normalizedControlRegionValue;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'region-change' && latestEvent.region !== undefined && latestEvent.region !== null) {
    return normalizeRegionContractValue(latestEvent.region);
  }

  return normalizeRegionContractValue(config.region);
}

function getConfiguredPageSize(config) {
  const configuredPageSize = Number(config?.pageSize ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(configuredPageSize) || configuredPageSize <= 0) {
    return DEFAULT_PAGE_SIZE;
  }

  return configuredPageSize;
}
