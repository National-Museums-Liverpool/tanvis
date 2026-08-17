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
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {},
        setData() {}
      };
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?include=taxon');
    expect(String(fetchMock.mock.calls[0][0])).toContain('sort=-occurrences_count');
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=10');
    expect(String(fetchMock.mock.calls[0][0])).toContain('offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.data).toBeUndefined();
    expect(element.textContent).toContain('Top 25 species by frequency trend');
  });

  it('includes the selected area in the header text', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 10,
      area: 'vc59'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = element.querySelector('.tanvis-table-header-text');
    expect(header).not.toBeNull();
    expect(header?.tagName).toBe('DIV');
    expect(header?.textContent).toContain('for vc59');
  });

  it('uses default topN=50 when value is not supplied', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] })
    });

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/taxon-stats?include=taxon');
    expect(String(fetchMock.mock.calls[0][0])).toContain('sort=-occurrences_count');
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=10');
    expect(String(fetchMock.mock.calls[0][0])).toContain('offset=0');
  });

  it('uses the table adapter groupId to filter requests when no control-block value is present', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 10,
      groupId: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
  });

  it('refetches with a taxon-group filter when the subscribed control changes group', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-increasing';
    controlElement.dataset.visArea = 'vc-all';
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
    expect(String(fetchMock.mock.calls[1][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
    expect(String(fetchMock.mock.calls[1][0])).toContain('include=taxon');
    expect(String(fetchMock.mock.calls[1][0])).toContain('sort=-occurrences_count');
  });

  it('keeps the table adapter groupId when the control block is at the default all-groups value', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-increasing-all-groups';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 10,
      control: 'vc-control-increasing-all-groups',
      groupId: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
  });

  it('uses the control-block language when present and overrides the table language', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-increasing-language';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'vernacular';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 10,
      control: 'vc-control-increasing-language',
      language: 'scientific'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.dataset.visTaxonGroupLabelMode).toBe('vernacular');
  });

  it('filters taxon-stats requests by the selected VC through higher_geography_identifier', async () => {
    window.Tabulator = function Tabulator(container, options) {
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {}
      };
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-increasing-area';
    controlElement.dataset.visArea = 'vc-59';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      control: 'vc-control-increasing-area'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('higher_geography_identifier%5Beq%5D=59');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('geographic_region_identifier%5Beq%5D');
  });

  it('caps later pages so they never exceed the configured topN', async () => {
    let capturedOptions = null;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    window.Tabulator = function Tabulator(container, options) {
      capturedOptions = options;
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {},
        setData() {},
        getData() {
          return [];
        }
      };
    };

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 25
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    await capturedOptions.ajaxRequestFunc('custom_handler', {}, { page: 3, size: 10 });

    expect(String(fetchMock.mock.calls[1][0])).toContain('limit=5');
    expect(String(fetchMock.mock.calls[1][0])).toContain('offset=20');
  });

  it('re-renders the group column on language-change and preserves it for paged requests', async () => {
    const setDataCalls = [];
    let capturedOptions = null;
    window.Tabulator = function Tabulator(container, options) {
      capturedOptions = options;
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on() {},
        setData(data) {
          setDataCalls.push(data);
        },
        getData() {
          return [];
        }
      };
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          taxon_identifier: '1003',
          taxon__scientific_name: 'Syritta pipiens',
          taxon__vernacular_name: 'Thick-legged Hoverfly',
          taxon_group__title: 'Diptera (Flies)',
          taxon_group__friendly: 'Flies',
          first_record_date: '1952-04-01',
          occurrences_count: 12034,
          grid_square_count: 612,
          frequency_trend: 67,
          geographic_region_identifier: 60
        }],
        meta: { total: 2 }
      })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-increasing-name-mode';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'scientific';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderIncreasingSpeciesTable(element, {
      type: 'increasing-species-table',
      topN: 20,
      control: 'vc-control-increasing-name-mode'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    publishControlEvent('vc-control-increasing-name-mode', {
      type: 'language-change',
      labelMode: 'vernacular'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const pageResult = await capturedOptions.ajaxRequestFunc('custom_handler', {}, { page: 2, size: 10 });

    expect(setDataCalls).toHaveLength(1);
    expect(setDataCalls[0][0].taxonGroup).toBe('Flies');
    expect(pageResult.data[0].taxonGroup).toBe('Flies');
  });
});