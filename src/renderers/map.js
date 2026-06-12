import { createBrcAtlasAdapter } from '../adapters/brcAtlas.js';

const atlasAdapter = createBrcAtlasAdapter();

export function renderMap(element, config) {
  atlasAdapter.render(element, config);
}
