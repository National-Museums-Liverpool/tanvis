import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter } from '../utils/visStatus.js';

// Adapter for Tanvis temporal year charts backed by BRC Charts.
// Keeps all dependency checks and data-loading in one place.

const DEFAULT_API_BASE = '/api/v1';
const TAXON_YEAR_STATS_RESOURCE = 'taxon-year-stats';
const DEFAULT_PAGE_LIMIT = 1000;

let temporalYearChartIdCounter = 0;

export function createTemporalYearChartAdapter() {
  return {
    name: 'temporal-year-chart',
    render(element, config) {
      const status = createVisStatusReporter(element);
      clearElement(element);
      status.showInfo('Loading...');

      loadTemporalYearChart(element, config)
        .then(() => {
          status.clear();
        })
        .catch((error) => {
          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render temporal year chart'));
        });
    }
  };
}

async function loadTemporalYearChart(element, config) {

  // If not taxonId is provided, we cannot load any data, 
  // so we just return early without rendering anything.
  if (!config.taxonId) return;

  const brcCharts = getBrcChartsGlobal();

  if (!brcCharts) {
    throw new Error('BRC Charts is not available. Include brccharts.umd.js before Tanvis.');
  }

  if (!getD3Global()) {
    throw new Error('D3 is not available. Include d3 before brccharts.umd.js and Tanvis.');
  }

  if (typeof brcCharts.temporal !== 'function') {
    throw new Error('BRC Charts temporal chart is not available. Include a compatible brccharts.umd.js bundle.');
  }

  const chartRecords = await fetchTaxonYearStats({
    apiBase: config.source || DEFAULT_API_BASE,
    taxonIdentifier: config.taxonId,
    startYear: config.startYear,
    endYear: config.endYear
  });

  const chartContainer = createTemporalYearChartContainer(element);
  const chartOptions = createTemporalYearChartOptions({
    config,
    chartContainer,
    chartRecords
  });

  clearElement(element);
  element.appendChild(chartContainer);
  brcCharts.temporal(chartOptions);
}

async function fetchTaxonYearStats({ apiBase, taxonIdentifier, startYear, endYear }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_YEAR_STATS_RESOURCE);
  const rows = [];
  let offset = 0;

  if (!taxonIdentifier) {
    return rows;
  }

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);

    if (Number.isFinite(startYear)) {
      pageUrl.searchParams.set('year[gte]', String(startYear));
    }

    if (Number.isFinite(endYear)) {
      pageUrl.searchParams.set('year[lte]', String(endYear));
    }

    pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
    pageUrl.searchParams.set('offset', String(offset));

    const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-year-stats');
    const pageRows = getListData(payload);
    rows.push(...pageRows);

    if (pageRows.length < DEFAULT_PAGE_LIMIT) {
      break;
    }

    offset += DEFAULT_PAGE_LIMIT;
  }

  return rows;
}

function createTemporalYearChartContainer(element) {
  const container = document.createElement('div');
  container.dataset.tanvisTemporalYearChart = 'chart';

  if (!element.id) {
    temporalYearChartIdCounter += 1;
    element.id = `tanvis-temporal-year-chart-${temporalYearChartIdCounter}`;
  }

  container.id = `${element.id}__chart`;
  return container;
}

function createTemporalYearChartOptions({ config, chartContainer, chartRecords }) {
  return {
    selector: `#${chartContainer.id}`,
    data: chartRecords.map((row) => ({
      period: Number(row.year),
      occurrences_count: Number(row.occurrences_count || 0),
      grid_square_count: Number(row.grid_square_count || 0)
    })),
    metrics: [
      { prop: 'occurrences_count', label: 'Occurrences', colour: '#c2410c' },
      { prop: 'grid_square_count', label: 'Grid squares', colour: '#1d4ed8' }
    ],
    periodType: 'year',
    chartStyle: 'line',
    lineInterpolator: 'curveMonotoneX',
    showLegend: true,
    interactivity: 'mousemove',
    minY: 0,
    ...(Number.isFinite(config.startYear) ? { minPeriod: config.startYear } : {}),
    ...(Number.isFinite(config.endYear) ? { maxPeriod: config.endYear } : {}),
    ...(config.expand !== undefined ? { expand: config.expand } : {}),
    ...(config.width !== undefined ? { width: config.width } : {}),
    ...(config.height !== undefined ? { height: config.height } : {})
  };
}

function resolveResourceUrl(apiBase, resourceName) {
  const baseUrl = new URL(apiBase, window.location.origin);
  const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
  baseUrl.pathname = `${pathname}${resourceName}`;
  baseUrl.search = '';
  baseUrl.hash = '';
  return baseUrl;
}

async function fetchJson(url, defaultErrorMessage) {
  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw createApiError({ defaultMessage: defaultErrorMessage, cause });
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
  }

  return payload || {};
}

function getListData(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.records)) {
    return payload.records;
  }

  return [];
}

function getBrcChartsGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.brccharts || null;
}

function getD3Global() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.d3 || null;
}
