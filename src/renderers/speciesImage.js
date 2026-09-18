import { createSpeciesImageAdapter } from '../adapters/speciesImage.js';

const speciesImageAdapter = createSpeciesImageAdapter();

export function renderSpeciesImage(element, config) {
  speciesImageAdapter.render(element, config);
}
