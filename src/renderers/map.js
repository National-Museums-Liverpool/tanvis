import { createBrcAtlasAdapter } from '../adapters/brcAtlas.js';

const atlasAdapter = createBrcAtlasAdapter();

export function renderStaticMap(element, config) {
  atlasAdapter.render(element, config);
}
