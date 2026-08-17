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
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return {
        on(eventName, handler) {
          handlers[eventName] = handler;
        },
        setData() {}
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
    expect(String(fetchMock.mock.calls[0][0])).toContain('last_record_date%5Blte%5D=2024-12-31');
    expect(String(fetchMock.mock.calls[0][0])).toContain('include=taxon');
    expect(String(fetchMock.mock.calls[0][0])).toContain('limit=10');
    expect(String(fetchMock.mock.calls[0][0])).toContain('offset=0');
    expect(tabulatorCalls).toHaveLength(1);
    expect(tabulatorCalls[0].options.columns).toHaveLength(5);
    expect(tabulatorCalls[0].options.data).toBeUndefined();
    expect(element.querySelector('[data-tabulator-mounted="true"]')).not.toBeNull();
    expect(element.textContent).toContain('on or before 2024');
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
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      area: 'vc59'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const header = element.querySelector('.tanvis-table-header-text');
    expect(header).not.toBeNull();
    expect(header?.tagName).toBe('DIV');
    expect(header?.textContent).toContain('for vc59');
  });

  it('emits taxon-identified with speciesId on row click', async () => {
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
    element.addEventListener('taxon-identified', (event) => {
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

  it('renders a Group column and updates it when the label mode toggle changes without refetching', async () => {
    const tabulatorInstances = [];

    window.Tabulator = function Tabulator(container, options) {
      const instance = {
        on() {},
        getData() {
          return Array.isArray(instance.__rows) ? instance.__rows : [];
        },
        setData(rows) {
          instance.__rows = rows;
        }
      };
      tabulatorInstances.push({ container, options, instance });
      container.dataset.tabulatorMounted = 'true';
      void options.ajaxRequestFunc('custom_handler', {}, { page: 1, size: 10 });
      return instance;
    };

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            taxon_identifier: 'NHMSYS0000001001',
            taxon__scientific_name: 'Eristalis arbustorum',
            taxon__vernacular_name: 'Marmalade Hoverfly',
            taxon_group__title: 'Diptera',
            taxon_group__friendly: 'Flies',
            last_record_date: '2023-08-12'
          }
        ]
      })
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-species-absent-label';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'scientific';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      control: 'vc-control-species-absent-label'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const groupColumn = tabulatorInstances[0].options.columns.find((column) => column.title === 'Group');
    expect(groupColumn).toBeDefined();
    expect(element.__tanvisLatestRows[0].taxonGroup).toBe('Diptera');

    publishControlEvent('vc-control-species-absent-label', {
      type: 'language-change',
      labelMode: 'vernacular'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.__tanvisLatestRows[0].taxonGroup).toBe('Flies');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    controlElement.remove();
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
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      groupId: 'diptera'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
  });

  it('includes control-block taxon-group and refetches when the group changes', async () => {
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
    controlElement.id = 'vc-control-species-absent';
    controlElement.dataset.visArea = 'vc-all';
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
    expect(String(fetchMock.mock.calls[1][0])).toContain('taxon_group__external_key%5Beq%5D=diptera');
    expect(String(fetchMock.mock.calls[1][0])).toContain('include=taxon');
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
    controlElement.id = 'vc-control-species-absent-all-groups';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      control: 'vc-control-species-absent-all-groups',
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
    controlElement.id = 'vc-control-species-absent-language';
    controlElement.dataset.visArea = 'vc-all';
    controlElement.dataset.visTaxonGroup = '';
    controlElement.dataset.visTaxonGroupLabelMode = 'vernacular';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      control: 'vc-control-species-absent-language',
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
    controlElement.id = 'vc-control-species-absent-area';
    controlElement.dataset.visArea = 'vc-60';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesAbsentSince(element, {
      type: 'species-absent-since',
      year: 2024,
      control: 'vc-control-species-absent-area'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(String(fetchMock.mock.calls[0][0])).toContain('higher_geography_identifier%5Beq%5D=60');
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('geographic_region_identifier%5Beq%5D');
  });
});
