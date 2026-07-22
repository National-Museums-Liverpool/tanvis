import { createGridStatsMapAdapter } from '../adapters/gridStatsMap.js';

const gridStatsMapAdapter = createGridStatsMapAdapter();

export function renderGridStatsMap(element, config) {
  gridStatsMapAdapter.render(element, config);
}
