import { createSpeciesAbsentSinceAdapter } from '../adapters/speciesAbsentSinceTable.js';

const speciesAbsentSinceAdapter = createSpeciesAbsentSinceAdapter();

export function renderSpeciesAbsentSince(element, config) {
  speciesAbsentSinceAdapter.render(element, config);
}
