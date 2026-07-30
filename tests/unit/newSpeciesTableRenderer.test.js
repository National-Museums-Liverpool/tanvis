import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderNewSpeciesTable } from '../../src/renderers/newSpeciesTable.js';

function createMockTabulator({ onInitialRequest } = {}) {
  return function Tabulator(container, options) {
    container.dataset.tabulatorMounted = 'true';

    if (typeof options?.ajaxRequestFunc === 'function') {
      void Promise.resolve().then(() => {
        if (typeof onInitialRequest === 'function') {
          onInitialRequest(options);
          return;
        }

        return options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      });
    }

    return {
      on() {},
      setData() {}
    };
  };
}

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
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {},
        setData(data) {
          options.data = data;
        }
      };
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?first_record_date%5Bgte%5D=2025-01-01&first_record_date%5Blte%5D=2025-12-31&include=taxon&limit=10&offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.pagination).toBe(true);
    expect(tabulatorCalls[0].options.columns).toHaveLength(5);
    expect(tabulatorCalls[0].options.data).toBeUndefined();
    expect(element.textContent).toContain('1 new species between 2025-01-01 and 2025-12-31');
  });

  it('uses the current date when endDate is omitted', async () => {
    window.Tabulator = createMockTabulator();

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
    expect(String(fetchMock.mock.calls[0][0])).toContain('include=taxon');
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

  it('shows the stylesheet warning beneath the rendered table content when Tabulator CSS is missing', async () => {
    Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => link.remove());
    window.Tabulator = createMockTabulator();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(element.querySelector('.tanvis-vis-status')?.textContent).toContain('Tabulator stylesheet is missing');
    expect(element.firstElementChild?.classList.contains('tanvis-vis-status')).toBe(true);
  });

  it('includes the control-block taxon-group filter when a group is selected', async () => {
    window.Tabulator = createMockTabulator();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species';
    controlElement.dataset.visArea = 'vc-all';
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('include=taxon');
  });

  it('does not seed Tabulator with a local data array when using remote pagination', async () => {
    let setDataCalls = 0;
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {},
        setData() {
          setDataCalls += 1;
        },
        options
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ taxon_identifier: '2001' }],
        meta: { total: 4007 }
      })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(setDataCalls).toBe(0);
  });

  it('initializes Tabulator with a container that is already mounted into the element', async () => {
    let mountedContainer = null;
    window.Tabulator = function Tabulator(container) {
      mountedContainer = container;
      container.dataset.tabulatorMounted = 'true';
      return {
        on() {},
        setData() {}
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mountedContainer?.parentNode).toBe(element);
  });
});