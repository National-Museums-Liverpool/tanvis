import { createLeafletMapAdapter } from '../adapters/leafletMap.js';

const leafletMapAdapter = createLeafletMapAdapter();

export function renderLeafletMap(element, config) {
  leafletMapAdapter.render(element, config);
}
