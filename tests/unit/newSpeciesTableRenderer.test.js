import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderNewSpeciesTable } from '../../src/renderers/newSpeciesTable.js';

describe('renderNewSpeciesTable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.Tabulator;
  });

  it('fetches records between start and end dates and renders a table', async () => {
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
            taxon_identifier: '2001',
            scientific_name: 'Eristalis tenax',
            vernacular_name: 'Drone Fly',
            vernacular_names: ['Drone Fly'],
            first_record_date: '2025-04-12',
            geographic_region_identifier: 58
          }
        ]
      })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?first_record_date%5Bgte%5D=2025-01-01&first_record_date%5Blte%5D=2025-12-31&limit=1000&offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.pagination).toBe(true);
    expect(tabulatorCalls[0].options.columns).toHaveLength(5);
    expect(tabulatorCalls[0].options.data).toEqual([
      {
        speciesId: '2001',
        scientificName: 'Eristalis tenax',
        commonName: 'Drone Fly',
        firstRecordDate: '2025-04-12',
        vcNumber: 58
      }
    ]);
    expect(element.querySelector('[data-tabulator-mounted="true"]')).not.toBeNull();
    expect(element.textContent).toContain('1 new species between 2025-01-01 and 2025-12-31');
  });

  it('uses the current date when endDate is omitted', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const today = new Date().toISOString().slice(0, 10);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`first_record_date%5Blte%5D=${today}`);
  });

  it('shows a clear error when Tabulator is not available', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('Tabulator is not available');
  });

  it('includes the control-block taxon-group filter when a group is selected', async () => {
    window.Tabulator = function Tabulator() {};

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species';
    controlElement.dataset.visArea = 'vc-58-59-60';
    controlElement.dataset.visTaxonGroup = 'diptera';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      control: 'vc-control-new-species'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group_external_key%5Beq%5D=diptera');
  });
});