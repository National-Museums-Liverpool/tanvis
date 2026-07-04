import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderIncreasingSpeciesTable } from '../../src/renderers/increasingSpeciesTable.js';

describe('renderIncreasingSpeciesTable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Tabulator;
  });

  it('requests topN records and renders a Tabulator table', async () => {
    const tabulatorCalls = [];
    window.Tabulator = function Tabulator(container, options) {
      tabulatorCalls.push({ container, options });
      container.dataset.tabulatorMounted = 'true';
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        records: [
          {
            speciesId: 1003,
            vcNumber: 60,
            rarityCategory: 'Common',
            firstRecordDate: '1952-04-01',
            totalRecords: 12034,
            occupiedGridSquares: 612,
            frequencyTrendScore: 67
          }
        ]
      })
    });

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 25
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/species-stats/increasing?topN=25');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.initialSort).toEqual([{ column: 'frequencyTrendScore', dir: 'desc' }]);
    expect(element.textContent).toContain('top 25');
  });

  it('uses default topN=50 when value is not supplied', async () => {
    window.Tabulator = function Tabulator() {};

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] })
    });

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/species-stats/increasing?topN=50');
  });
});