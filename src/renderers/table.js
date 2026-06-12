import { createTabulatorAdapter } from '../adapters/tabulator.js';

const tableAdapter = createTabulatorAdapter();

export function renderTable(element, config) {
  tableAdapter.render(element, config);
}
