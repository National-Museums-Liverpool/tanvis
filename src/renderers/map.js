import { createBrcAtlasAdapter } from '../adapters/staticMap.js';

const atlasAdapter = createBrcAtlasAdapter();

export function renderStaticMap(element, config) {
  atlasAdapter.render(element, config);
}
