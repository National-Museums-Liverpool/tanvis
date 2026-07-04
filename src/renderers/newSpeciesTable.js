import { createNewSpeciesTableAdapter } from '../adapters/newSpeciesTable.js';

const newSpeciesTableAdapter = createNewSpeciesTableAdapter();

export function renderNewSpeciesTable(element, config) {
  // Renderers are Tanvis-facing entry points keyed by data-vis-type.
  // Adapters keep the implementation details for a specific library or API integration.
  newSpeciesTableAdapter.render(element, config);
}