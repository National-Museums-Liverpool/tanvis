import { createSpeciesTaxonomyBlockAdapter } from '../adapters/speciesTaxonomyBlock.js';

const speciesTaxonomyBlockAdapter = createSpeciesTaxonomyBlockAdapter();

export function renderSpeciesTaxonomyBlock(element, config) {
  speciesTaxonomyBlockAdapter.render(element, config);
}
