import { createTabulatorAdapter } from '../adapters/tabulator.js';

const tableAdapter = createTabulatorAdapter();

export function renderTable(element, config) {
  // Renderers are Tanvis-facing entry points keyed by data-vis-type.
  // Adapters keep the implementation details for a specific library or API integration.
  tableAdapter.render(element, config);
}
