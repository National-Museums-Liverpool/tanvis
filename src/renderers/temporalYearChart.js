import { createTemporalYearChartAdapter } from '../adapters/temporalYearChart.js';

const temporalYearChartAdapter = createTemporalYearChartAdapter();

export function renderTemporalYearChart(element, config) {
  temporalYearChartAdapter.render(element, config);
}