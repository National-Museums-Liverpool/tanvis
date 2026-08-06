import { clearElement } from '../utils/dom.js';
import { createApiError, normalizeErrorMessage, parseJsonSafe } from '../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../utils/visStatus.js';
import { resolveApiBase } from '../config/apiBase.js';
import { logApiRequest } from '../utils/apiRequest.js';
import { D3_DEPENDENCY_MESSAGE } from '../utils/colourMapDots.js';
import { createRadioGroup } from '../controls/radioGroup.js';
import { subscribeToControl } from '../controls/controlBus.js';
import { ensureSharedStyles } from '../styles/sharedStyles.js';

// Adapter for Tanvis temporal year charts backed by BRC Charts.
// Keeps all dependency checks and data-loading in one place.

const TAXON_YEAR_STATS_RESOURCE = 'taxon-year-stats';
const DEFAULT_PAGE_LIMIT = 10000;

let temporalYearChartIdCounter = 0;

export function createTemporalYearChartAdapter() {
  return {
    name: 'temporal-year-chart',
    render(element, config) {
      clearLinkedTableSubscription(element);
      clearControlSubscriptions(element);
      const renderConfig = { ...config };

      if (renderConfig.control) {
        const controlElement = document.getElementById(renderConfig.control);
        const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
          if (!event || event.type !== 'area-change') {
            return;
          }

          const nextArea = event.area === undefined || event.area === null
            ? renderConfig.area
            : event.area;
          const currentArea = element.dataset.visArea ?? renderConfig.area;

          if (nextArea === currentArea) {
            return;
          }

          element.dataset.visArea = nextArea ?? '';
          updateTemporalYearChartForSpecies(element, {
            ...renderConfig,
            area: nextArea,
            taxonId: element.dataset.visTaxonid || renderConfig.taxonId
          });
        });

        const onSpeciesSelection = (event) => {
          const speciesId = event?.detail?.speciesId;
          if (typeof speciesId !== 'string' || !speciesId.trim()) {
            return;
          }

          const trimmedSpeciesId = speciesId.trim();
          if (trimmedSpeciesId === element.dataset.visTaxonid) {
            return;
          }

          element.dataset.visTaxonid = trimmedSpeciesId;
          updateTemporalYearChartForSpecies(element, {
            ...renderConfig,
            area: element.dataset.visArea ?? renderConfig.area,
            taxonId: trimmedSpeciesId
          });
        };

        if (controlElement) {
          controlElement.addEventListener('species-row-selected', onSpeciesSelection);
        }

        element.__tanvisControlCleanup = () => {
          controlBusCleanup?.();
          if (controlElement) {
            controlElement.removeEventListener('species-row-selected', onSpeciesSelection);
          }
        };
        element.__tanvisControlId = renderConfig.control;
      }

      if (renderConfig.linkedTable) {
        element.__tanvisLinkedTableCleanup = subscribeToLinkedTable(renderConfig.linkedTable, (speciesId) => {
          if (!speciesId || speciesId === element.dataset.visTaxonid) {
            return;
          }

          updateTemporalYearChartForSpecies(element, {
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

function clearControlSubscriptions(element) {
  const cleanup = element?.__tanvisControlCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisControlCleanup;
  delete element.__tanvisControlId;
}

async function updateTemporalYearChartForSpecies(element, config) {
  const brcCharts = getBrcChartsGlobal();
  const chartInstance = element.__tanvisTemporalYearChartInstance;

  if (!chartInstance || typeof chartInstance.setChartOpts !== 'function') {
    return createTemporalYearChartAdapter().render(element, config);
  }

  const normalizedStartYear = normalizeYearValue(config.startYear);
  const normalizedEndYear = normalizeYearValue(config.endYear);
  const chartRecords = await fetchTaxonYearStats({
    apiBase: resolveApiBase(),
    taxonIdentifier: config.taxonId,
    startYear: normalizedStartYear,
    endYear: normalizedEndYear,
    area: config.area
  });

  const temporalStatsType = resolveActiveTemporalStatsType(element, config);
  const metric = resolveTemporalMetric(temporalStatsType, config);
  const chartContainer = element.querySelector('[data-tanvis-temporal-year-chart="chart"]');
  const chartOptions = createTemporalYearChartOptions({
    config,
    chartContainer,
    chartRecords,
    temporalStatsType,
    startYear: normalizedStartYear,
    endYear: normalizedEndYear
  });

  element.dataset.visTaxonid = config.taxonId || '';
  setTemporalStatsTypeState(element, temporalStatsType);
  element.__tanvisTemporalYearLoadId = (element.__tanvisTemporalYearLoadId || 0) + 1;

  const transformedData = transformTemporalYearChartData(chartRecords);

  console.log('Switch taxon', metric, transformedData);

  chartInstance.setChartOpts({
    ...chartOptions,
    metrics: [metric],
    data: transformedData
  });
}

async function loadTemporalYearChart(element, config, status) {

  console.log('Loading temporal year chart');

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
    endYear: normalizedEndYear,
    area: config.area
  });

  const chartContainer = createTemporalYearChartContainer(element);
  const initialStatsType = resolveTemporalStatsType(config.temporalStatsType);
  setTemporalStatsTypeState(element, initialStatsType);
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
  element.__tanvisTemporalYearChartInstance = chartInstance;

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

async function fetchTaxonYearStats({ apiBase, taxonIdentifier, startYear, endYear, area }) {
  const resourceUrl = resolveResourceUrl(apiBase, TAXON_YEAR_STATS_RESOURCE);
  const rows = [];
  let offset = 0;

  if (!taxonIdentifier) {
    return rows;
  }

  while (true) {
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);
    pageUrl.searchParams.set('year[gte]', String(startYear));
    pageUrl.searchParams.set('year[lte]', String(endYear));
    pageUrl.searchParams.set('higher_geography_identifier[eq]', area ? area : 'null');
    pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));
    pageUrl.searchParams.set('offset', String(offset));
 
    const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-year-stats');

    console.log('Fetched taxon-year-stats page', offset, payload);

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
      const metric = resolveTemporalMetric(temporalStatsType, config);

      console.log('Switch control', metric);

      chartInstance.setChartOpts({
        metrics: [metric],
        data: transformTemporalYearChartData(chartRecords, temporalStatsType)
      });

      setTemporalStatsTypeState(chartElement, temporalStatsType);
    }
  });

  group.classList.add('tanvis-temporal-year-chart-switch', 'tanvis-grid-stats-switch');
  return group;
}

function createTemporalYearChartOptions({ config, chartContainer, chartRecords, temporalStatsType, startYear, endYear }) {
  const metric = resolveTemporalMetric(temporalStatsType, config);

  return {
    selector: `#${chartContainer.id}`,
    data: transformTemporalYearChartData(chartRecords, temporalStatsType),
    metrics: [metric],
    periodType: 'year',
    chartStyle: config.chartType,
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

function resolveActiveTemporalStatsType(element, config) {
  const selectedControlValue = getSelectedTemporalStatsTypeFromControl(element);
  if (selectedControlValue === 'records' || selectedControlValue === 'squares') {
    return selectedControlValue;
  }

  const hostValue = resolveTemporalStatsType(element?.__tanvisTemporalYearActiveStatsType);
  if (hostValue === 'records' || hostValue === 'squares') {
    return hostValue;
  }

  const datasetValue = resolveTemporalStatsType(element?.dataset?.tanvisTemporalStatsType);
  if (datasetValue === 'records' || datasetValue === 'squares') {
    return datasetValue;
  }

  return resolveTemporalStatsType(config.temporalStatsType);
}

function getSelectedTemporalStatsTypeFromControl(element) {
  if (!element) {
    return null;
  }

  const checkedInput = element.querySelector('.tanvis-temporal-year-chart-switch input[type="radio"]:checked');
  if (!checkedInput) {
    return null;
  }

  return resolveTemporalStatsType(checkedInput.value);
}

function setTemporalStatsTypeState(element, temporalStatsType) {
  const normalized = resolveTemporalStatsType(temporalStatsType);

  if (element) {
    element.dataset.tanvisTemporalStatsType = normalized;
    element.__tanvisTemporalYearActiveStatsType = normalized;
  }

  return normalized;
}

function resolveTemporalMetric(temporalStatsType, config) {
  if (temporalStatsType === 'squares') {
    return { prop: 'count', label: 'Grid squares', colour: config.squaresColour };
  }

  return { prop: 'count', label: 'Records', colour: config.recordsColour };
}

function transformTemporalYearChartData(chartRecords, temporalStatsType = 'records') {
  const normalizedStatsType = resolveTemporalStatsType(temporalStatsType);

  return chartRecords.map((row) => ({
    period: Number(row.year),
    count: Number(normalizedStatsType === 'squares'
      ? (row.grid_square_count || 0)
      : (row.occurrences_count || 0))
  }));
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
