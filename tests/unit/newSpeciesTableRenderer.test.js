import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderNewSpeciesTable } from '../../src/renderers/newSpeciesTable.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

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
    expect(String(fetchMock.mock.calls[0][0])).toContain('first_record_date%5Bgte%5D=2025-01-01');
    expect(String(fetchMock.mock.calls[0][0])).toContain('first_record_date%5Blte%5D=2025-12-31');
    expect(String(fetchMock.mock.calls[0][0])).toContain('include=taxon');
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=10');
    expect(String(fetchMock.mock.calls[0][0])).toContain('offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.pagination).toBe(true);
    expect(tabulatorCalls[0].options.columns).toHaveLength(6);
    expect(tabulatorCalls[0].options.data).toBeUndefined();
    expect(element.textContent).toContain('1 new species between 2025-01-01 and 2025-12-31');
  });

  it('includes the selected area in the header text', async () => {
    window.Tabulator = createMockTabulator();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      area: '59'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = element.querySelector('.tanvis-table-header-text');
    expect(header).not.toBeNull();
    expect(header?.tagName).toBe('DIV');
    expect(header?.textContent).toContain('for vc59');
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

  it('uses the table adapter groupId to filter requests when no control-block value is present', async () => {
    window.Tabulator = createMockTabulator();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      groupId: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
    expect(String(fetchMock.mock.calls[0][0])).toContain('include=taxon');
  });

  it('keeps the table adapter groupId when the control block is at the default all-groups value', async () => {
    window.Tabulator = createMockTabulator();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species-all-groups';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      control: 'vc-control-new-species-all-groups',
      groupId: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
  });

  it('uses the control-block language when present and overrides the table language', async () => {
    window.Tabulator = createMockTabulator();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species-language';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'vernacular';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      control: 'vc-control-new-species-language',
      language: 'scientific'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.dataset.visTaxonGroupLabelMode).toBe('vernacular');
  });

  it('filters taxon-stats requests by the selected VC through higher_geography_identifier', async () => {
    window.Tabulator = createMockTabulator();

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species-area';
    controlElement.dataset.visArea = 'vc-58';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      control: 'vc-control-new-species-area'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('higher_geography_identifier%5Beq%5D=58');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('geographic_region_identifier%5Beq%5D');
  });

  it('re-renders the visible rows on language-change without refetching', async () => {
    const setDataCalls = [];
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {},
        setData(data) {
          setDataCalls.push(data);
        }
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          taxon_identifier: '2001',
          taxon__scientific_name: 'Eristalis tenax',
          taxon__vernacular_name: 'Drone Fly',
          taxon_group__title: 'Diptera (Flies)',
          taxon_group__friendly: 'Flies',
          first_record_date: '2025-04-12'
        }],
        meta: { total: 1 }
      })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species-name-mode';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'scientific';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      control: 'vc-control-new-species-name-mode'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    publishControlEvent('vc-control-new-species-name-mode', {
      type: 'language-change',
      labelMode: 'vernacular'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setDataCalls).toHaveLength(1);
    expect(setDataCalls[0][0].taxonGroup).toBe('Flies');
  });

  it('keeps the active label mode for paged requests', async () => {
    let pageResult = null;
    let capturedOptions = null;
    window.Tabulator = function Tabulator(container, options) {
      capturedOptions = options;
      container.dataset.tabulatorMounted = 'true';
      return {
        on() {},
        setData() {}
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          taxon_identifier: '2001',
          taxon__scientific_name: 'Eristalis tenax',
          taxon__vernacular_name: 'Drone Fly',
          taxon_group__title: 'Diptera (Flies)',
          taxon_group__friendly: 'Flies',
          first_record_date: '2025-04-12'
        }],
        meta: { total: 2 }
      })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-new-species-paged';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'vernacular';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderNewSpeciesTable(element, {
      type: 'new-species-table',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      control: 'vc-control-new-species-paged'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const tableContainer = element.querySelector('[data-tanvis-table-container="true"]');
    const tabulatorInstance = tableContainer.__tanvisTable;
    pageResult = await capturedOptions.ajaxRequestFunc('custom_handler', {}, { page: 2, size: 10 });

    expect(pageResult.data[0].taxonGroup).toBe('Flies');
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