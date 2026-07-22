import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';

const DEFAULT_API_BASE = '/api/v1';
const TAXON_STATS_RESOURCE = 'taxon-stats';
const DEFAULT_PAGE_LIMIT = 1000;
const columns = [
  { title: 'Species ID', field: 'speciesId', sorter: 'string' },
  { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
  { title: 'Common name', field: 'commonName', sorter: 'string' },
  { title: 'First record date', field: 'firstRecordDate', sorter: 'string' },
  { title: 'VC number', field: 'vcNumber', sorter: 'number' }
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
      const apiBase = renderConfig.source || DEFAULT_API_BASE;
      const geographicRegionIdentifier = areaToGeographicRegionIdentifier(renderConfig.area);
      const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
      const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
      element.__tanvisNewSpeciesLoadId = loadId;
      element.dataset.visArea = renderConfig.area;
      element.dataset.visTaxonGroup = taxonGroupExternalKey;

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

          element.dataset.visArea = nextArea;
          element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
          createNewSpeciesTableAdapter().render(element, {
            ...renderConfig,
            area: nextArea
          });
        });
      }

      buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier, taxonGroupExternalKey })
        .then((records) => {
          if (element.__tanvisNewSpeciesLoadId !== loadId) {
            return;
          }

          const Tabulator = getTabulatorGlobal();

          if (!Tabulator) {
            throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
          }

          clearElement(element);
          element.appendChild(createSummary(startDate, endDate, records.length));
          element.appendChild(createTableContainer(records, Tabulator));
          status.clear();
        })
        .catch((error) => {
          if (element.__tanvisNewSpeciesLoadId !== loadId) {
            return;
          }

          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render new species table'));
        });
    }
  };
}

function createSummary(startDate, endDate, count) {
  const summary = document.createElement('p');
  summary.textContent = `${count} new species between ${startDate} and ${endDate}`;
  return summary;
}

function createTableContainer(records, Tabulator) {
  const container = document.createElement('div');

  new Tabulator(container, {
    data: records,
    columns,
    layout: 'fitColumns',
    pagination: true,
    paginationSize: 10,
    placeholder: 'No records found'
  });

  const table = new Tabulator(container, {
    data: records,
    columns,
    layout: 'fitColumns',
    pagination: true,
    paginationSize: 10,
    placeholder: 'No records found'
  });

  table.on("rowClick", function(e, row) {
    // Triggered whenever a user clicks a row
    const rowData = row.getData();
    const speciesId = rowData.speciesId; 

    // Create a custom event containing the ID in the 'detail' property
    const rowSelectedEvent = new CustomEvent("species-row-selected", {
        detail: { speciesId: speciesId },
        bubbles: true, // Allows the event to bubble up the DOM tree
        cancelable: true
    });

    // Dispatch the event from the table element (or window / document)
    container.dispatchEvent(rowSelectedEvent);
  });

  return container;
}

function getCurrentIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier, taxonGroupExternalKey }) {
  const taxonStatsRows = await fetchTaxonStatsInRange({
    apiBase,
    startDate,
    endDate,
    geographicRegionIdentifier,
    taxonGroupExternalKey
  });

  return taxonStatsRows.map((row) => {
    return {
      speciesId: row.taxon_identifier,
      scientificName: row.scientific_name || '',
      commonName: formatVernacularName(row),
      firstRecordDate: row.first_record_date,
      vcNumber: row.geographic_region_identifier
    };
  });
}

async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, geographicRegionIdentifier, taxonGroupExternalKey }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('first_record_date[gte]', startDate);
    pageUrl.searchParams.set('first_record_date[lte]', endDate);
    pageUrl.searchParams.set('include', 'taxon');
    if (Number.isFinite(geographicRegionIdentifier)) {
      pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
    }
    if (taxonGroupExternalKey) {
      pageUrl.searchParams.set('taxon_group_external_key[eq]', taxonGroupExternalKey);
    }
    pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
    pageUrl.searchParams.set('offset', String(offset));

    const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-stats');
    const pageRows = getListData(payload);
    rows.push(...pageRows);

    if (pageRows.length < DEFAULT_PAGE_LIMIT) {
      break;
    }

    offset += DEFAULT_PAGE_LIMIT;
  }

  return rows;
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

function formatVernacularName(taxon) {
  const plural = taxon?.vernacular_names;
  if (Array.isArray(plural)) {
    return plural.join(', ');
  }

  return taxon?.vernacular_name || '';
}

function areaToGeographicRegionIdentifier(area) {
  if (area === 'vc-58') {
    return 58;
  }

  if (area === 'vc-59') {
    return 59;
  }

  if (area === 'vc-60') {
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
    return config.area;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area) {
    return latestEvent.area;
  }

  if (typeof document === 'undefined') {
    return config.area;
  }

  const controlElement = document.getElementById(config.control);
  const controlArea = controlElement?.dataset?.visArea;
  return controlArea || config.area;
}

function getEffectiveTaxonGroup(config) {
  if (!config.control || typeof document === 'undefined') {
    return '';
  }

  const controlElement = document.getElementById(config.control);
  return controlElement?.dataset?.visTaxonGroup || '';
}

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}