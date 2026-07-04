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
        records: [
          {
            speciesId: 2001,
            scientificName: 'Eristalis tenax',
            commonName: 'Drone Fly',
            firstRecordDate: '2025-04-12',
            vcNumber: 58
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/new-species?startDate=2025-01-01&endDate=2025-12-31');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.pagination).toBe(true);
    expect(tabulatorCalls[0].options.columns).toHaveLength(5);
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
    expect(String(fetchMock.mock.calls[0][0])).toContain(`endDate=${today}`);
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
});