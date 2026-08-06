import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { D3_DEPENDENCY_MESSAGE } from '../utils/colourMapDots.js';
import { createRadioGroup } from '../controls/radioGroup.js';
import { ensureSharedStyles } from '../styles/sharedStyles.js';

// Adapter for Tanvis temporal year charts backed by BRC Charts.
// Keeps all dependency checks and data-loading in one place.

const TAXON_YEAR_STATS_RESOURCE = 'taxon-year-stats';
const DEFAULT_PAGE_LIMIT = 1000;

let temporalYearChartIdCounter = 0;

export function createTemporalYearChartAdapter() {
  return {
    name: 'temporal-year-chart',
    render(element, config) {
      clearLinkedTableSubscription(element);
      const renderConfig = { ...config };

      if (renderConfig.linkedTable) {
        element.__tanvisLinkedTableCleanup = subscribeToLinkedTable(renderConfig.linkedTable, (speciesId) => {
          if (!speciesId || speciesId === element.dataset.visTaxonid) {
            return;
          }

          createTemporalYearChartAdapter().render(element, {
            ...renderConfig,
            taxonId: speciesId
          });
        });
      }

      const loadId = (element.__tanvisTemporalYearLoadId || 0) + 1;
      element.__tanvisTemporalYearLoadId = loadId;
      element.dataset.visTaxonid = renderConfig.taxonId || '';
      const status = createVisStatusReporter(element);
      clearElement(element);
      status.showInfo('Loading...');

      loadTemporalYearChart(element, renderConfig, status)
        .then(() => {
          if (element.__tanvisTemporalYearLoadId !== loadId) {
            return;
          }

          if (element.__tanvisTemporalYearChartHasStylesheet !== false) {
            status.clear();
          }
        })
        .catch((error) => {
          if (element.__tanvisTemporalYearLoadId !== loadId) {
            return;
          }

          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render temporal year chart'));
        });
    }
  };
}

function subscribeToLinkedTable(linkedTableId, onSpeciesSelected) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const linkedTableElement = document.getElementById(linkedTableId);
  if (!linkedTableElement) {
    return undefined;
  }

  const onRowSelected = (event) => {
    const speciesId = event?.detail?.speciesId;
    if (typeof speciesId !== 'string' || !speciesId.trim()) {
      return;
    }

    onSpeciesSelected(speciesId.trim());
  };

  linkedTableElement.addEventListener('species-row-selected', onRowSelected);
  return () => {
    linkedTableElement.removeEventListener('species-row-selected', onRowSelected);
  };
}

function clearLinkedTableSubscription(element) {
  const cleanup = element?.__tanvisLinkedTableCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisLinkedTableCleanup;
}

async function loadTemporalYearChart(element, config, status) {

  // If not taxonId is provided, we cannot load any data, 
  // so we just return early without rendering anything.
  if (!config.taxonId) return;

  const brcCharts = getBrcChartsGlobal();

  if (!brcCharts) {
    throw new Error('BRC Charts is not available. Include brccharts.umd.js before Tanvis.');
  }

  if (!getD3Global()) {
    throw new Error('D3 is not available. Include d3.v7.min.js and brccharts.umd.js before using the Tanvis temporal year chart.');
  }

  const hasStylesheet = ensureStylesheetDependency(status, {
    libraryName: 'BRC Charts',
    stylesheetHints: ['brccharts.umd.css'],
    message: 'BRC Charts stylesheet is missing. Include brccharts.umd.css to ensure the chart is styled correctly.'
  });

  element.__tanvisTemporalYearChartHasStylesheet = hasStylesheet;

  if (typeof brcCharts.temporal !== 'function') {
    throw new Error('BRC Charts temporal chart is not available. Include a compatible brccharts.umd.js bundle.');
  }

  ensureSharedStyles();

  const normalizedStartYear = normalizeYearValue(config.startYear);
  const normalizedEndYear = normalizeYearValue(config.endYear);
  const chartRecords = await fetchTaxonYearStats({
    apiBase: resolveApiBase(),
    taxonIdentifier: config.taxonId,
    startYear: normalizedStartYear,
    endYear: normalizedEndYear
  });

  const chartContainer = createTemporalYearChartContainer(element);
  const initialStatsType = resolveTemporalStatsType(config.temporalStatsType);
  const chartOptions = createTemporalYearChartOptions({
    config,
    chartContainer,
    chartRecords,
    temporalStatsType: initialStatsType,
    startYear: normalizedStartYear,
    endYear: normalizedEndYear
  });

  const statusElement = element.__tanvisVisStatusElement;
  clearElement(element);

  if (statusElement && statusElement.parentNode !== element) {
    element.appendChild(statusElement);
  }

  element.appendChild(chartContainer);

  const chartInstance = brcCharts.temporal(chartOptions);

  if (config.temporalStatsType === 'switch') {
    element.appendChild(createTemporalStatsTypeSwitchControl({
      chartElement: element,
      selectedValue: initialStatsType,
      chartInstance,
      config,
      chartRecords
    }));
  }

  if (config.temporalStatsType === 'records' || config.temporalStatsType === 'squares') {
    element.dataset.tanvisTemporalStatsType = initialStatsType;
  }
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

function createTemporalStatsTypeSwitchControl({ chartElement, selectedValue = 'records', chartInstance, config, chartRecords }) {
  const group = createRadioGroup({
    name: `${chartElement.id || 'tanvis-temporal-year-chart'}-temporal-stats-switch`,
    selectedValue,
    items: [
      { value: 'records', label: 'Records' },
      { value: 'squares', label: 'Squares' }
    ],
    onChange: (value) => {
      if (!chartInstance || typeof chartInstance.setChartOpts !== 'function') {
        return;
      }

      const temporalStatsType = resolveTemporalStatsType(value);
      const metric = temporalStatsType === 'squares'
        ? { prop: 'grid_square_count', label: 'Grid squares', colour: '#1d4ed8' }
        : { prop: 'occurrences_count', label: 'Occurrences', colour: '#c2410c' };

      chartInstance.setChartOpts({
        metrics: [metric],
        data: chartRecords.map((row) => ({
          period: Number(row.year),
          occurrences_count: Number(row.occurrences_count || 0),
          grid_square_count: Number(row.grid_square_count || 0)
        }))
      });

      chartElement.dataset.tanvisTemporalStatsType = temporalStatsType;
    }
  });

  group.classList.add('tanvis-temporal-year-chart-switch', 'tanvis-grid-stats-switch');
  return group;
}

function createTemporalYearChartOptions({ config, chartContainer, chartRecords, temporalStatsType, startYear, endYear }) {
  const metric = resolveTemporalMetric(temporalStatsType);

  return {
    selector: `#${chartContainer.id}`,
    data: chartRecords.map((row) => ({
      period: Number(row.year),
      occurrences_count: Number(row.occurrences_count || 0),
      grid_square_count: Number(row.grid_square_count || 0)
    })),
    metrics: [metric],
    periodType: 'year',
    chartStyle: 'line',
    lineInterpolator: 'curveMonotoneX',
    showLegend: true,
    interactivity: 'mousemove',
    minY: 0,
    perRow: 1,
    ...(Number.isFinite(startYear) ? { minPeriod: startYear } : {}),
    ...(Number.isFinite(endYear) ? { maxPeriod: endYear } : {}),
    ...(config.expand !== undefined ? { expand: config.expand } : {}),
    ...(config.width !== undefined ? { width: config.width } : {}),
    ...(config.height !== undefined ? { height: config.height } : {})
  };
}

function normalizeYearValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function resolveTemporalStatsType(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'squares') {
    return 'squares';
  }

  if (normalized === 'records') {
    return 'records';
  }

  return 'records';
}

function resolveTemporalMetric(temporalStatsType) {
  if (temporalStatsType === 'squares') {
    return { prop: 'grid_square_count', label: 'Grid squares', colour: '#1d4ed8' };
  }

  return { prop: 'occurrences_count', label: 'Occurrences', colour: '#c2410c' };
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
  logApiRequest(url, { method: 'GET' });

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
  // Resolve D3 from the same global context used in tests so the adapter
  // behaves consistently in both the browser and Vitest.
  if (typeof window === 'undefined' && typeof globalThis === 'undefined') {
    return null;
  }

  return globalThis.d3 || window?.d3 || null;
}
