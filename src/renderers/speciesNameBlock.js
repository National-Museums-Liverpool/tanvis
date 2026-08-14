import { createSpeciesNameBlockAdapter } from '../adapters/speciesNameBlock.js';

const speciesNameBlockAdapter = createSpeciesNameBlockAdapter();

export function renderSpeciesNameBlock(element, config) {
  speciesNameBlockAdapter.render(element, config);
}