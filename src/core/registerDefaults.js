// Makes initialization idempotent so calling init() repeatedly 
// does not keep re-registering the same renderers.

import { registerRenderer } from './registry.js';
import { renderControlBlock, renderSpeciesIdentifier, renderNewSpeciesTable, renderIncreasingSpeciesTable, renderSpeciesAbsentSince, renderSpeciesMap, renderGridStatsMap, renderTemporalYearChart } from '../renderers/index.js';

let defaultsRegistered = false;

export function registerDefaults() {
  if (defaultsRegistered) {
    return;
  }

  registerRenderer('control-block', renderControlBlock);
  registerRenderer('species-identifier', renderSpeciesIdentifier);
  registerRenderer('new-species-table', renderNewSpeciesTable);
  registerRenderer('increasing-species-table', renderIncreasingSpeciesTable);
  registerRenderer('species-absent-since', renderSpeciesAbsentSince);
  registerRenderer('species-map', renderSpeciesMap);
  registerRenderer('grid-stats-map', renderGridStatsMap);
  registerRenderer('temporal-year-chart', renderTemporalYearChart);
  defaultsRegistered = true;
}
