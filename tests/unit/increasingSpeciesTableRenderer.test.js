import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderIncreasingSpeciesTable } from '../../src/renderers/increasingSpeciesTable.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

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
        data: [
          {
            taxon_identifier: '1003',
            scientific_name: 'Syritta pipiens',
            vernacular_name: 'Thick-legged Hoverfly',
            vernacular_names: ['Thick-legged Hoverfly'],
            rarity_group_name: 'Common',
            geographic_region_identifier: 60,
            first_record_date: '1952-04-01',
            occurrences_count: 12034,
            grid_square_count: 612,
            frequency_trend: 67
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?include=taxon&limit=1000&offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.initialSort).toEqual([{ column: 'frequencyTrendScore', dir: 'desc' }]);
    expect(tabulatorCalls[0].options.data).toEqual([
      {
        speciesId: '1003',
        vcNumber: 60,
        rarityCategory: 'Common',
        firstRecordDate: '1952-04-01',
        totalRecords: 12034,
        occupiedGridSquares: 612,
        frequencyTrendScore: 67,
        scientificName: 'Syritta pipiens',
        commonName: 'Thick-legged Hoverfly'
      }
    ]);
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

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?include=taxon&limit=1000&offset=0');
  });

  it('refetches with a taxon-group filter when the subscribed control changes group', async () => {
    window.Tabulator = function Tabulator() {};

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-increasing';
    controlElement.dataset.visArea = 'vc-58-59-60';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      control: 'vc-control-increasing'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    controlElement.dataset.visTaxonGroup = 'diptera';
    publishControlEvent('vc-control-increasing', {
      type: 'taxon-group-change',
      taxonGroup: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('taxon_group_external_key%5Beq%5D=diptera');
    expect(String(fetchMock.mock.calls[1][0])).toContain('include=taxon');
  });
});