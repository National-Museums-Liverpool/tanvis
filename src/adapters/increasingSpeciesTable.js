import { clearElement } from '../utils/dom.js';
import { getLatestControlEvent, subscribeToControl } from '../controls/controlBus.js';

const DEFAULT_API_BASE = '/api/v1';
const TAXON_STATS_RESOURCE = 'taxon-stats';
const TAXON_RESOURCE = 'taxon';
const DEFAULT_PAGE_LIMIT = 1000;
const TAXON_IN_FILTER_CHUNK_SIZE = 150;
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
      clearElement(element);
      element.textContent = 'Loading...';

      const effectiveArea = getEffectiveArea(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };

      const topN = parseTopN(renderConfig.topN) ?? DEFAULT_TOP_N;
      const apiBase = renderConfig.source || DEFAULT_API_BASE;
      const geographicRegionIdentifier = areaToGeographicRegionIdentifier(renderConfig.area);
      const loadId = (element.__tanvisIncreasingLoadId || 0) + 1;
      element.__tanvisIncreasingLoadId = loadId;
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
          createIncreasingSpeciesTableAdapter().render(element, {
            ...renderConfig,
            area: event.area
          });
        });
      }

      buildIncreasingSpeciesRecords({ apiBase, topN, geographicRegionIdentifier })
        .then((records) => {
          if (element.__tanvisIncreasingLoadId !== loadId) {
            return;
          }

          const Tabulator = getTabulatorGlobal();

          if (!Tabulator) {
            throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
          }

          clearElement(element);
          element.appendChild(createSummary(topN, records.length));
          element.appendChild(createTableContainer(records, Tabulator));
        })
        .catch((error) => {
          if (element.__tanvisIncreasingLoadId !== loadId) {
            return;
          }

          clearElement(element);
          element.textContent = error.message;
        });
    }
  };
}

function createSummary(topN, count) {
  const summary = document.createElement('p');
  summary.textContent = `${count} species returned (top ${topN} by frequency trend)`;
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
    initialSort: [
      { column: 'frequencyTrendScore', dir: 'desc' }
    ],
    placeholder: 'No records found'
  });

  return container;
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

async function buildIncreasingSpeciesRecords({ apiBase, topN, geographicRegionIdentifier }) {
  const taxonStatsRows = await fetchTaxonStats({ apiBase, geographicRegionIdentifier });
  const rankedRows = taxonStatsRows
    .slice()
    .sort((a, b) => Number(b?.frequency_trend || 0) - Number(a?.frequency_trend || 0))
    .slice(0, topN);

  const taxaByIdentifier = await fetchTaxaByIdentifier({
    apiBase,
    taxonIdentifiers: rankedRows.map((row) => row.taxon_identifier)
  });

  return rankedRows.map((row) => {
    const taxon = taxaByIdentifier.get(row.taxon_identifier);

    return {
      speciesId: row.taxon_identifier,
      vcNumber: row.geographic_region_identifier,
      rarityCategory: taxon?.rarity_group_name || '',
      firstRecordDate: row.first_record_date,
      totalRecords: row.occurrences_count,
      occupiedGridSquares: row.grid_square_count,
      frequencyTrendScore: row.frequency_trend,
      scientificName: taxon?.scientific_name || '',
      commonName: formatVernacularName(taxon)
    };
  });
}

async function fetchTaxonStats({ apiBase, geographicRegionIdentifier }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
  const rows = [];
  let offset = 0;

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
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

  const resourceUrl = resolveResourceUrl(apiBase, TAXON_RESOURCE);
  const chunks = chunkArray(uniqueIdentifiers, TAXON_IN_FILTER_CHUNK_SIZE);
  const payloads = await Promise.all(chunks.map((chunk) => {
    const url = new URL(resourceUrl.toString());
    url.searchParams.set('taxon_identifier[in]', chunk.join(','));
    return fetchJson(url.toString(), 'Failed to load taxon data');
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
  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.error || defaultErrorMessage);
  }

  return payload;
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