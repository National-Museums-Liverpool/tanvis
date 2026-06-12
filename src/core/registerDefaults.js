// Makes initialization idempotent so calling init() repeatedly 
// does not keep re-registering the same renderers.

import { registerRenderer } from './registry.js';
import { renderTable, renderChart, renderMap } from '../renderers/index.js';

let defaultsRegistered = false;

export function registerDefaults() {
  if (defaultsRegistered) {
    return;
  }

  registerRenderer('table', renderTable);
  registerRenderer('chart', renderChart);
  registerRenderer('map', renderMap);
  defaultsRegistered = true;
}
