import { clearElement } from '../utils/dom.js';

const DEFAULT_ENDPOINT = '/api/species-stats/increasing';
const DEFAULT_TOP_N = 50;
const columns = [
  { title: 'Species ID', field: 'speciesId', sorter: 'number' },
  { title: 'VC number', field: 'vcNumber', sorter: 'number' },
  { title: 'Rarity category', field: 'rarityCategory', sorter: 'string' },
  { title: 'First record date', field: 'firstRecordDate', sorter: 'string' },
  { title: 'Total records', field: 'totalRecords', sorter: 'number' },
  { title: 'Occupied grid squares', field: 'occupiedGridSquares', sorter: 'number' },
  { title: 'Frequency trend', field: 'frequencyTrendScore', sorter: 'number' }
];

export function createIncreasingSpeciesTableAdapter() {
  return {
    name: 'increasing-species-table',
    render(element, config) {
      clearElement(element);
      element.textContent = 'Loading...';

      const topN = parseTopN(config.topN) ?? DEFAULT_TOP_N;
      const endpoint = config.source || DEFAULT_ENDPOINT;
      const requestUrl = new URL(endpoint, window.location.origin);
      requestUrl.searchParams.set('topN', String(topN));

      fetch(requestUrl.toString())
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.error || 'Failed to load increasing species data');
          }

          const records = Array.isArray(payload) ? payload : payload.records || [];
          const Tabulator = getTabulatorGlobal();

          if (!Tabulator) {
            throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
          }

          clearElement(element);
          element.appendChild(createSummary(topN, records.length));
          element.appendChild(createTableContainer(records, Tabulator));
        })
        .catch((error) => {
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