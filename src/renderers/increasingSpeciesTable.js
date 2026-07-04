import { createIncreasingSpeciesTableAdapter } from '../adapters/increasingSpeciesTable.js';

const increasingSpeciesTableAdapter = createIncreasingSpeciesTableAdapter();

export function renderIncreasingSpeciesTable(element, config) {
  // Renderers are Tanvis-facing entry points keyed by data-vis-type.
  // Adapters keep the implementation details for a specific library or API integration.
  increasingSpeciesTableAdapter.render(element, config);
}