import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderTemporalYearChart } from '../../src/renderers/temporalYearChart.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

const DEFAULT_CHART_TYPE = 'line';
const DEFAULT_RECORDS_COLOUR = '#1d4ed8';
const DEFAULT_SQUARES_COLOUR = '#c2410c';

describe('renderTemporalYearChart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.brccharts;
    document.body.innerHTML = '';
    document.head.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());
  });

  it('shows a clear error when BRC Charts is not available', async () => {
    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('BRC Charts is not available');
  });

  it('shows a clear error when D3 is not available', async () => {
    window.brccharts = {
      temporal: () => ({})
    };
    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('D3 is not available');
    expect(element.textContent).toContain('d3.v7.min.js');
    expect(element.textContent).toContain('brccharts.umd.js');
  });

  it('shows an info message when the BRC Charts stylesheet is missing', async () => {
    Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => link.remove());
    window.d3 = {
      scaleSequential: () => ({
        domain: () => ({
          interpolator: () => ({})
        })
      }),
      interpolateCividis: () => ({}),
      interpolateViridis: () => ({})
    };
    window.brccharts = {
      temporal: () => ({})
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });
    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('BRC Charts stylesheet');
    expect(element.textContent).toContain('brccharts.umd.css');
    expect(element.firstElementChild?.classList.contains('tanvis-vis-status')).toBe(true);
    expect(element.querySelector('[data-tanvis-temporal-year-chart="chart"]')).not.toBeNull();
  });

  it('queries taxon-year-stats and passes transformed yearly data to brccharts.temporal', async () => {
    const temporalCalls = [];
    window.d3 = {};
    window.brccharts = {
      temporal: (options) => {
        temporalCalls.push(options);
        return {};
      }
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            taxon_identifier: 'NHMSYS0001234567',
            year: 2016,
            occurrences_count: 14,
            grid_square_count: 8
          },
          {
            taxon_identifier: 'NHMSYS0001234567',
            year: 2017,
            occurrences_count: 21,
            grid_square_count: 13
          }
        ]
      })
    });

    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      chartType: DEFAULT_CHART_TYPE,
      recordsColour: DEFAULT_RECORDS_COLOUR,
      squaresColour: DEFAULT_SQUARES_COLOUR,
      startYear: 2016,
      endYear: 2017
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-year-stats?taxon_identifier%5Beq%5D=NHMSYS0001234567&year%5Bgte%5D=2016&year%5Blte%5D=2017&higher_geography_identifier%5Beq%5D=null&limit=10000&offset=0');
    expect(temporalCalls).toHaveLength(1);
    expect(temporalCalls[0].periodType).toBe('year');
    expect(temporalCalls[0].chartStyle).toBe('line');
    expect(temporalCalls[0].metrics).toEqual([
      { prop: 'count', label: 'Records (all VCs)', colour: DEFAULT_RECORDS_COLOUR }
    ]);
    expect(temporalCalls[0].data).toEqual([
      {
        period: 2016,
        count: 14
      },
      {
        period: 2017,
        count: 21
      }
    ]);
    expect(element.querySelector('[data-tanvis-temporal-year-chart="chart"]')).not.toBeNull();
  });

  it('shows API errors from taxon-year-stats', async () => {
    window.d3 = {};
    window.brccharts = {
      temporal: () => ({})
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'year range is invalid' })
    });

    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      startYear: 2025,
      endYear: 2024
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('API error: year range is invalid');
  });

  it('renders a switch control under the chart when temporalStatsType is switch', async () => {
    window.d3 = {};
    window.brccharts = {
      temporal: () => ({})
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      temporalStatsType: 'switch'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const control = element.querySelector('.tanvis-temporal-year-chart-switch');
    const buttons = element.querySelectorAll('.tanvis-temporal-year-chart-switch input[type="radio"]');

    expect(control).not.toBeNull();
    expect(control.classList.contains('tanvis-grid-stats-switch')).toBe(true);
    expect(document.getElementById('tanvis-shared-styles')).not.toBeNull();
    expect(buttons).toHaveLength(2);
    expect(Array.from(buttons).map((button) => button.value)).toEqual(['records', 'squares']);
  });

  it('updates the chart metrics via setChartOpts when the temporal stats switch changes', async () => {
    const temporalCalls = [];
    const setChartOptsCalls = [];
    window.d3 = {};
    window.brccharts = {
      temporal: (options) => {
        temporalCalls.push(options);
        const chart = {
          setChartOpts: (opts) => {
            setChartOptsCalls.push(opts);
            return Promise.resolve();
          }
        };
        return chart;
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');

    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      chartType: DEFAULT_CHART_TYPE,
      recordsColour: DEFAULT_RECORDS_COLOUR,
      squaresColour: DEFAULT_SQUARES_COLOUR,
      temporalStatsType: 'switch'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(temporalCalls[0].metrics).toEqual([
      { prop: 'count', label: 'Records (all VCs)', colour: DEFAULT_RECORDS_COLOUR }
    ]);

    const squaresInput = element.querySelector('.tanvis-temporal-year-chart-switch input[value="squares"]');
    squaresInput.checked = true;
    squaresInput.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(setChartOptsCalls).toHaveLength(1);
    expect(setChartOptsCalls[0].metrics).toEqual([
      { prop: 'count', label: 'Grid squares (all VCs)', colour: DEFAULT_SQUARES_COLOUR }
    ]);
  });

  it('updates the existing chart in place when a linked-table species selection changes', async () => {
    const temporalCalls = [];
    const setChartOptsCalls = [];
    window.d3 = {};
    window.brccharts = {
      temporal: (options) => {
        temporalCalls.push(options);
        return {
          setChartOpts: (opts) => {
            setChartOptsCalls.push(opts);
            return Promise.resolve();
          }
        };
      }
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            year: 2020,
            occurrences_count: 4,
            grid_square_count: 2
          }
        ]
      })
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      chartType: DEFAULT_CHART_TYPE,
      recordsColour: DEFAULT_RECORDS_COLOUR,
      squaresColour: DEFAULT_SQUARES_COLOUR,
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: {
        speciesId: 'NHMSYS0007654321'
      }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('taxon_identifier%5Beq%5D=NHMSYS0007654321');
    expect(temporalCalls).toHaveLength(1);
    expect(setChartOptsCalls).toHaveLength(1);
    expect(setChartOptsCalls[0].metrics).toEqual([
      { prop: 'count', label: 'Records (all VCs)', colour: DEFAULT_RECORDS_COLOUR }
    ]);
  });

  it('preserves the selected squares metric when a linked-table species selection changes after toggling the switch', async () => {
    const setChartOptsCalls = [];
    window.d3 = {};
    window.brccharts = {
      temporal: () => ({
        setChartOpts: (opts) => {
          setChartOptsCalls.push(opts);
          return Promise.resolve();
        }
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            year: 2020,
            occurrences_count: 4,
            grid_square_count: 2
          }
        ]
      })
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      chartType: DEFAULT_CHART_TYPE,
      recordsColour: DEFAULT_RECORDS_COLOUR,
      squaresColour: DEFAULT_SQUARES_COLOUR,
      temporalStatsType: 'switch',
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 20));

    const squaresInput = element.querySelector('.tanvis-temporal-year-chart-switch input[value="squares"]');
    squaresInput.checked = true;
    squaresInput.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    setChartOptsCalls.length = 0;

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: {
        speciesId: 'NHMSYS0007654321'
      }
    }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(setChartOptsCalls).toHaveLength(1);
    expect(setChartOptsCalls[0].metrics).toEqual([
      { prop: 'count', label: 'Grid squares (all VCs)', colour: DEFAULT_SQUARES_COLOUR }
    ]);
  });

  it('reacts to control-block area changes and taxonIdSource species selection events', async () => {
    const setChartOptsCalls = [];
    window.d3 = {};
    window.brccharts = {
      temporal: () => ({
        setChartOpts: (opts) => {
          setChartOptsCalls.push(opts);
          return Promise.resolve();
        }
      })
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            year: 2020,
            occurrences_count: 4,
            grid_square_count: 2
          }
        ]
      })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'control-block';
    document.body.appendChild(controlElement);

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderTemporalYearChart(element, {
      type: 'temporal-year-chart',
      taxonId: 'NHMSYS0001234567',
      chartType: DEFAULT_CHART_TYPE,
      recordsColour: DEFAULT_RECORDS_COLOUR,
      squaresColour: DEFAULT_SQUARES_COLOUR,
      control: 'control-block',
      taxonIdSource: 'linked-table',
      area: 'GB-123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    publishControlEvent('control-block', {
      type: 'area-change',
      area: 'GB-999'
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: {
        speciesId: 'NHMSYS0007654321'
      }
    }));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain('higher_geography_identifier%5Beq%5D=GB-999');
    expect(String(fetchMock.mock.calls[2][0])).toContain('taxon_identifier%5Beq%5D=NHMSYS0007654321');
    expect(setChartOptsCalls).toHaveLength(2);

    taxonIdSource.remove();
    controlElement.remove();
  });
});