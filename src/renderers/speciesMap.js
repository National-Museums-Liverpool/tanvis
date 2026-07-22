import { createSpeciesMapAdapter } from '../adapters/speciesMap.js';

const speciesMapAdapter = createSpeciesMapAdapter();

export function renderSpeciesMap(element, config) {
  speciesMapAdapter.render(element, config);
}
