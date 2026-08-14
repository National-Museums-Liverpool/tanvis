import { createSpeciesRemarksBlockAdapter } from '../adapters/speciesRemarksBlock.js';

const speciesRemarksBlockAdapter = createSpeciesRemarksBlockAdapter();

export function renderSpeciesRemarksBlock(element, config) {
  speciesRemarksBlockAdapter.render(element, config);
}