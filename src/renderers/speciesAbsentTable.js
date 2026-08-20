import { createSpeciesAbsentTableAdapter } from '../adapters/speciesAbsentTable.js';

const speciesAbsentTableAdapter = createSpeciesAbsentTableAdapter();

export function renderSpeciesAbsentTable(element, config) {
  speciesAbsentTableAdapter.render(element, config);
}
