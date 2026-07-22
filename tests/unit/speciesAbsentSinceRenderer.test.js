import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderSpeciesAbsentSince } from '../../src/renderers/speciesAbsentSince.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

describe('renderSpeciesAbsentSince', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Tabulator;
  });

  it('fetches records with a last_record_date cutoff and renders a table', async () => {
    const tabulatorCalls = [];
    window.Tabulator = function Tabulator(container, options) {
      const handlers = {};
      tabulatorCalls.push({ container, options, handlers });
      container.dataset.tabulatorMounted = 'true';
      return {
        on(eventName, handler) {
          handlers[eventName] = handler;
        }
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            taxon_identifier: 'NHMSYS0000001001',
            scientific_name: 'Eristalis arbustorum',
            vernacular_name: 'Marmalade Hoverfly',
            vernacular_names: ['Marmalade Hoverfly'],
            last_record_date: '2023-08-12',
            geographic_region_identifier: 58
          }
        ]
      })
    });

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?last_record_date%5Blte%5D=2024-12-31&include=taxon&limit=1000&offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.columns).toHaveLength(5);
    expect(tabulatorCalls[0].options.data).toEqual([
      {
        speciesId: 'NHMSYS0000001001',
        scientificName: 'Eristalis arbustorum',
        commonName: 'Marmalade Hoverfly',
        lastRecordDate: '2023-08-12',
        vcNumber: 58
      }
    ]);
    expect(element.querySelector('[data-tabulator-mounted="true"]')).not.toBeNull();
    expect(element.textContent).toContain('on or before 2024');
  });

  it('emits species-row-selected with speciesId on row click', async () => {
    const tabulatorCalls = [];
    window.Tabulator = function Tabulator(container, options) {
      const handlers = {};
      tabulatorCalls.push({ container, options, handlers });
      return {
        on(eventName, handler) {
          handlers[eventName] = handler;
        }
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            taxon_identifier: 'NHMSYS0000001002',
            scientific_name: 'Criorhina berberina',
            vernacular_name: 'Hairy-eyed Hoverfly',
            vernacular_names: ['Hairy-eyed Hoverfly'],
            last_record_date: '2022-05-03',
            geographic_region_identifier: 59
          }
        ]
      })
    });

    const element = document.createElement('div');
    const selectedSpeciesIds = [];
    element.addEventListener('species-row-selected', (event) => {
      selectedSpeciesIds.push(event.detail?.speciesId);
    });

    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const rowClickHandler = tabulatorCalls[0].handlers.rowClick;
    rowClickHandler({}, {
      getData() {
        return { speciesId: 'NHMSYS0000001002' };
      }
    });

    expect(selectedSpeciesIds).toEqual(['NHMSYS0000001002']);
  });

  it('shows a clear error when Tabulator is not available', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('Tabulator is not available');
  });

  it('includes control-block taxon-group and refetches when the group changes', async () => {
    window.Tabulator = function Tabulator() {
      return {
        on() {}
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-species-absent';
    controlElement.dataset.visArea = 'vc-58-59-60';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      control: 'vc-control-species-absent'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    controlElement.dataset.visTaxonGroup = 'diptera';
    publishControlEvent('vc-control-species-absent', {
      type: 'taxon-group-change',
      taxonGroup: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('taxon_group_external_key%5Beq%5D=diptera');
    expect(String(fetchMock.mock.calls[1][0])).toContain('include=taxon');
  });
});
