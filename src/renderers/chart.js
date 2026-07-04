import { createBrcChartsAdapter } from '../adapters/brcCharts.js';

const chartAdapter = createBrcChartsAdapter();

export function renderChart(element, config) {
  // Renderers are Tanvis-facing entry points keyed by data-vis-type.
  // Adapters keep the implementation details for a specific library or API integration.
  chartAdapter.render(element, config);
}
