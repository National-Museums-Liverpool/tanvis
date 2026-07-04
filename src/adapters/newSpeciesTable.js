import { clearElement } from '../utils/dom.js';

const DEFAULT_ENDPOINT = '/api/new-species';
const columns = [
  { title: 'Species ID', field: 'speciesId', sorter: 'number' },
  { title: 'Scientific name', field: 'scientificName', sorter: 'string' },
  { title: 'Common name', field: 'commonName', sorter: 'string' },
  { title: 'First record date', field: 'firstRecordDate', sorter: 'string' },
  { title: 'VC number', field: 'vcNumber', sorter: 'number' }
];

export function createNewSpeciesTableAdapter() {
  return {
    name: 'new-species-table',
    render(element, config) {
      clearElement(element);
      element.textContent = 'Loading...';

      const startDate = config.startDate;
      const endDate = config.endDate || getCurrentIsoDate();
      const endpoint = config.source || DEFAULT_ENDPOINT;
      const requestUrl = new URL(endpoint, window.location.origin);
      requestUrl.searchParams.set('startDate', startDate);
      requestUrl.searchParams.set('endDate', endDate);

      fetch(requestUrl.toString())
        .then(async (response) => {
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.error || 'Failed to load new species data');
          }

          const records = Array.isArray(payload) ? payload : payload.records || [];
          const Tabulator = getTabulatorGlobal();

          if (!Tabulator) {
            throw new Error('Tabulator is not available. Include the Tabulator script before Tanvis.');
          }

          clearElement(element);
          element.appendChild(createSummary(startDate, endDate, records.length));
          element.appendChild(createTableContainer(records, Tabulator));
        })
        .catch((error) => {
          clearElement(element);
          element.textContent = error.message;
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

function getTabulatorGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.Tabulator || null;
}