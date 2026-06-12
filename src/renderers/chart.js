import { createBrcChartsAdapter } from '../adapters/brcCharts.js';

const chartAdapter = createBrcChartsAdapter();

export function renderChart(element, config) {
  chartAdapter.render(element, config);
}
