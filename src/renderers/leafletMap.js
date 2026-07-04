import { createLeafletMapAdapter } from '../adapters/leafletMap.js';

const leafletMapAdapter = createLeafletMapAdapter();

export function renderLeafletMap(element, config) {
  // Renderers are Tanvis-facing entry points keyed by data-vis-type.
  // Adapters keep the implementation details for a specific library or API integration.
  leafletMapAdapter.render(element, config);
}
