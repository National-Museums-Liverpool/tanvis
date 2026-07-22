import { renderLeafletAtlasMap } from '../adapters/map/leafletBackend.js';

export function renderLeafletMap(element, config) {
  renderLeafletAtlasMap(element, config, {
    idPrefix: 'tanvis-leaflet-map',
    errorMessage: 'Failed to render slippy map'
  });
}
