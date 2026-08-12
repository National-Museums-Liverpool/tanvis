import { createSpeciesIdentifierAdapter } from '../adapters/speciesIdentifier.js';

const speciesIdentifierAdapter = createSpeciesIdentifierAdapter();

export function renderSpeciesIdentifier(element, config) {
  speciesIdentifierAdapter.render(element, config);
}