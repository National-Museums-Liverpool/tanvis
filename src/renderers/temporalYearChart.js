import { createBrcChartsAdapter } from '../adapters/brcCharts.js';

const temporalYearChartAdapter = createBrcChartsAdapter({ rendererType: 'temporal-year-chart' });

export function renderTemporalYearChart(element, config) {
  temporalYearChartAdapter.render(element, config);
}