import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderTemporalYearChart } from '../../src/renderers/temporalYearChart.js';

describe('renderTemporalYearChart', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.brccharts;
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
      startYear: 2016,
      endYear: 2017
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-year-stats?taxon_identifier%5Beq%5D=NHMSYS0001234567&year%5Bgte%5D=2016&year%5Blte%5D=2017&limit=1000&offset=0');
    expect(temporalCalls).toHaveLength(1);
    expect(temporalCalls[0].periodType).toBe('year');
    expect(temporalCalls[0].chartStyle).toBe('line');
    expect(temporalCalls[0]).not.toHaveProperty('taxa');
    expect(temporalCalls[0].metrics).toEqual([
      { prop: 'occurrences_count', label: 'Occurrences', colour: '#c2410c' },
      { prop: 'grid_square_count', label: 'Grid squares', colour: '#1d4ed8' }
    ]);
    expect(temporalCalls[0].data).toEqual([
      {
        period: 2016,
        occurrences_count: 14,
        grid_square_count: 8
      },
      {
        period: 2017,
        occurrences_count: 21,
        grid_square_count: 13
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
});