import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';

const DEFAULT_API_BASE = '/api/v1';
const TAXON_STATS_RESOURCE = 'taxon-stats';
const TAXA_RESOURCE = 'taxa';
const DEFAULT_PAGE_LIMIT = 1000;
const TAXA_IN_FILTER_CHUNK_SIZE = 150;
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
      const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
      element.__tanvisNewSpeciesLoadId = loadId;
      element.dataset.visArea = renderConfig.area;

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (event?.type !== 'area-change' || !event.area) {
            return;
          }

          if (event.area === element.dataset.visArea) {
            return;
          }

          element.dataset.visArea = event.area;
          createNewSpeciesTableAdapter().render(element, {
            ...renderConfig,
            area: event.area
          });
        });
      }

      buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier })
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

  return container;
}

function getCurrentIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function buildNewSpeciesRecords({ apiBase, startDate, endDate, geographicRegionIdentifier }) {
  const taxonStatsRows = await fetchTaxonStatsInRange({
    apiBase,
    startDate,
    endDate,
    geographicRegionIdentifier
  });
  const taxaByIdentifier = await fetchTaxaByIdentifier({
    apiBase,
    taxonIdentifiers: taxonStatsRows.map((row) => row.taxon_identifier)
  });

  return taxonStatsRows.map((row) => {
    const taxon = taxaByIdentifier.get(row.taxon_identifier);

    return {
      speciesId: row.taxon_identifier,
      scientificName: taxon?.scientific_name || '',
      commonName: formatVernacularName(taxon),
      firstRecordDate: row.first_record_date,
      vcNumber: row.geographic_region_identifier
    };
  });
}

async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, geographicRegionIdentifier }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('first_record_date[gte]', startDate);
    pageUrl.searchParams.set('first_record_date[lte]', endDate);
    if (Number.isFinite(geographicRegionIdentifier)) {
      pageUrl.searchParams.set('geographic_region_identifier[eq]', String(geographicRegionIdentifier));
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

async function fetchTaxaByIdentifier({ apiBase, taxonIdentifiers }) {
  const uniqueIdentifiers = Array.from(new Set(taxonIdentifiers.filter(Boolean)));
  const taxaByIdentifier = new Map();

  if (uniqueIdentifiers.length === 0) {
    return taxaByIdentifier;
  }

  const resourceUrl = resolveResourceUrl(apiBase, TAXA_RESOURCE);
  const chunks = chunkArray(uniqueIdentifiers, TAXA_IN_FILTER_CHUNK_SIZE);
  const payloads = await Promise.all(chunks.map((chunk) => {
    const url = new URL(resourceUrl.toString());
    url.searchParams.set('taxon_identifier[in]', chunk.join(','));
    return fetchJson(url.toString(), 'Failed to load taxa');
  }));

  payloads.forEach((payload) => {
    getListData(payload).forEach((taxon) => {
      if (taxon?.taxon_identifier) {
        taxaByIdentifier.set(taxon.taxon_identifier, taxon);
      }
    });
  });

  return taxaByIdentifier;
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

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
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

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}