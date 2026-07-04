// Makes initialization idempotent so calling init() repeatedly 
// does not keep re-registering the same renderers.

import { registerRenderer } from './registry.js';
import { renderTable, renderChart, renderStaticMap, renderLeafletMap, renderNewSpeciesTable } from '../renderers/index.js';

let defaultsRegistered = false;

export function registerDefaults() {
  if (defaultsRegistered) {
    return;
  }

  registerRenderer('table', renderTable);
  registerRenderer('chart', renderChart);
  registerRenderer('static-map', renderStaticMap);
  registerRenderer('slippy-map', renderLeafletMap);
  registerRenderer('new-species-table', renderNewSpeciesTable);
  defaultsRegistered = true;
}
