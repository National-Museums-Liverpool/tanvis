import { createSpeciesInfoBlockAdapter } from '../adapters/speciesInfoBlock.js';

const speciesInfoBlockAdapter = createSpeciesInfoBlockAdapter();

export function renderSpeciesInfoBlock(element, config) {
  speciesInfoBlockAdapter.render(element, config);
}