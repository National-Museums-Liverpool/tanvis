import { createBrcAtlasAdapter } from '../adapters/staticMap.js';

const atlasAdapter = createBrcAtlasAdapter();

export function renderStaticMap(element, config) {
  // Renderers are Tanvis-facing entry points keyed by data-vis-type.
  // Adapters keep the implementation details for a specific library or API integration.
  atlasAdapter.render(element, config);
}
