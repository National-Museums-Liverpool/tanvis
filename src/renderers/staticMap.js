import { renderStaticAtlasMap } from '../adapters/map/staticBackend.js';

export function renderStaticMap(element, config) {
  renderStaticAtlasMap(element, config, {
    idPrefix: 'tanvis-map',
    errorMessage: 'Failed to render static map'
  });
}
