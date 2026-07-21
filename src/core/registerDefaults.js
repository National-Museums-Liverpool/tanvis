// Makes initialization idempotent so calling init() repeatedly 
// does not keep re-registering the same renderers.

import { registerRenderer } from './registry.js';
import { renderStaticMap, renderLeafletMap, renderControlBlock, renderNewSpeciesTable, renderIncreasingSpeciesTable, renderTemporalYearChart } from '../renderers/index.js';

let defaultsRegistered = false;

export function registerDefaults() {
  if (defaultsRegistered) {
    return;
  }

  registerRenderer('static-map', renderStaticMap);
  registerRenderer('slippy-map', renderLeafletMap);
  registerRenderer('control-block', renderControlBlock);
  registerRenderer('new-species-table', renderNewSpeciesTable);
  registerRenderer('increasing-species-table', renderIncreasingSpeciesTable);
  registerRenderer('temporal-year-chart', renderTemporalYearChart);
  defaultsRegistered = true;
}
