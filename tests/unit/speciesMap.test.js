import * as d3 from 'd3';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { createOccurrenceData, applyOccurrenceDataToMap } from '../../src/adapters/speciesMap.js';
import { renderSpeciesMap } from '../../src/renderers/speciesMap.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

describe('species map redraw flow', () => {
  beforeEach(() => {
    globalThis.d3 = d3;
    globalThis.L = {};
    window.L = globalThis.L;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.brcatlas;
    document.querySelectorAll('#linked-table, #control').forEach((node) => node.remove());
  });

  it('shows an explicit D3 dependency message when D3 is missing', async () => {
    delete globalThis.d3;
    delete window.d3;

    window.brcatlas = {
      svgMap: () => ({ setMapType() {}, redrawMap() {} })
    };

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('D3 is not available');
    expect(element.textContent).toContain('d3.v7.min.js');
  });

  it('switches the map to the occurrences type and redraws it', () => {
    const calls = [];
    const map = {
      setMapType(type) {
        calls.push(['setMapType', type]);
      },
      redrawMap() {
        calls.push(['redrawMap']);
      }
    };

    applyOccurrenceDataToMap(map, [{ grid_ref_2km: 'SJ58D' }]);

    expect(calls).toEqual([
      ['setMapType', 'occurrences'],
      ['redrawMap']
    ]);
  });

  it('does not recreate the map when the control bus reports the same normalized area', () => {
    let createCount = 0;

    window.brcatlas = {
      svgMap: () => {
        createCount += 1;
        return {
          setMapType() {},
          redrawMap() {}
        };
      }
    };

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-59',
      taxonId: 'ABC123',
      control: 'control-block'
    });

    publishControlEvent('control-block', {
      type: 'area-change',
      area: 59
    });

    expect(createCount).toBe(1);
  });

  it('uses the created map instance for the initial occurrence redraw after the first fetch', async () => {
    const calls = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType(type) {
          calls.push(['setMapType', type]);
        },
        redrawMap() {
          calls.push(['redrawMap']);
        }
      })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
    });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(calls).toEqual([
      ['redrawMap'],
      ['setMapType', 'occurrences'],
      ['redrawMap']
    ]);
  });

  it('uses the latest occurrence rows in the occurrences adapter', async () => {
    const payload = await createOccurrenceData([{ grid_ref_2km: 'SJ58D' }]);

    expect(payload.records[0]).toMatchObject({
      gr: 'SJ58D',
      val: 1,
      caption: 'SJ58D: 1 records'
    });
  });

  it('ignores rows without grid_ref_2km', async () => {
    const payload = await createOccurrenceData([{ grid_square: 'SJ58D' }]);

    expect(payload.records).toEqual([]);
  });

  it('uses the most recently available occurrence data while a new area fetch is pending', async () => {
    const mapTypeHandlers = {};
    let resolveSecondFetch;

    window.brcatlas = {
      svgMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        return {
          setMapType() {},
          redrawMap() {}
        };
      }
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const area = new URL(url).searchParams.get('higher_geography_identifier[eq]');
      if (area === '58') {
        return {
          ok: true,
          json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
        };
      }

      return new Promise((resolve) => {
        resolveSecondFetch = resolve;
      });
    });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    let payload = await mapTypeHandlers.occurrences();
    expect(payload.records[0]).toMatchObject({ gr: 'SJ58D', val: 1 });

    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-59',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    payload = await mapTypeHandlers.occurrences();
    expect(payload.records[0]).toMatchObject({ gr: 'SJ58D', val: 1 });

    resolveSecondFetch?.({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ59Y' }] })
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    payload = await mapTypeHandlers.occurrences();
    expect(payload.records[0]).toMatchObject({ gr: 'SJ59Y', val: 1 });
  });

  it('uses host element dataset values for dot styling when rendering the map', async () => {
    const mapTypeHandlers = {};

    window.brcatlas = {
      svgMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        return {
          setMapType() {},
          redrawMap() {}
        };
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
    });

    const element = document.createElement('div');
    element.dataset.visDotColour = 'orange';
    element.dataset.visTransformation = 'sqrt';
    element.dataset.visDotShape = 'triangle';

    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = await mapTypeHandlers.occurrences();

    expect(payload.shape).toBe('triangle');
    expect(payload.opacity).toBe(1);
    expect(payload.records[0]).toMatchObject({
      gr: 'SJ58D',
      colour: 'orange'
    });
  });

  it('preserves dataset dot styling when switching from static to leaflet', async () => {
    const mapTypeHandlers = {};

    window.brcatlas = {
      svgMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        return {
          setMapType() {},
          redrawMap() {}
        };
      },
      leafletMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        return {
          setMapType() {},
          redrawMap() {}
        };
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
    });

    const element = document.createElement('div');
    element.dataset.visDotColour = 'orange';
    element.dataset.visTransformation = 'sqrt';
    element.dataset.visDotShape = 'triangle';

    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'switch',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const leafletInput = element.querySelector('input[type="radio"][value="leaflet"]');
    leafletInput.checked = true;
    leafletInput.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = await mapTypeHandlers.occurrences();

    expect(payload.shape).toBe('triangle');
    expect(payload.records[0]).toMatchObject({ colour: 'orange' });
  });

  it('keeps the map-type toggle visible when a switch-based map is re-rendered as leaflet', async () => {
    window.brcatlas = {
      svgMap: () => ({ setMapType() {}, redrawMap() {} }),
      leafletMap: () => ({ setMapType() {}, redrawMap() {} })
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
    });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'switch',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'leaflet',
      area: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.querySelector('input[type="radio"][value="static"]')).not.toBeNull();
    expect(element.querySelector('input[type="radio"][value="leaflet"]')).not.toBeNull();
  });

  it('re-renders the species map after a linked table row selection', async () => {
    const mapTypeHandlers = {};
    const requestedSpecies = [];

    window.brcatlas = {
      svgMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        return {
          setMapType() {},
          redrawMap() {}
        };
      }
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      requestedSpecies.push(speciesCode);

      const payloadRows = speciesCode === 'XYZ999'
        ? [{ grid_ref_2km: 'SJ99A' }]
        : [{ grid_ref_2km: 'SJ58D' }];

      return {
        ok: true,
        json: async () => ({ data: payloadRows })
      };
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123',
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = await mapTypeHandlers.occurrences();

    expect(requestedSpecies).toEqual(['ABC123', 'XYZ999']);
    expect(payload.records[0]).toMatchObject({ gr: 'SJ99A', val: 1 });

    taxonIdSource.remove();
  });

  it('reuses the existing map instance when a linked table row changes the species', async () => {
    const createdMaps = [];

    window.brcatlas = {
      svgMap: () => {
        const map = {
          setMapType() {},
          redrawMap() {}
        };
        createdMaps.push(map);
        return map;
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123',
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createdMaps).toHaveLength(1);

    taxonIdSource.remove();
  });

  it('updates the currently visible map after switching map type and selecting a linked-table species', async () => {
    const createdMaps = [];
    const mapTypeHandlers = {};

    window.brcatlas = {
      svgMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        const map = {
          setMapType() {},
          redrawMap() {},
          redrawCount: 0
        };
        map.setMapType = () => {
          map.redrawCount += 1;
        };
        map.redrawMap = () => {
          map.redrawCount += 1;
        };
        createdMaps.push(map);
        return map;
      },
      leafletMap: (opts) => {
        Object.assign(mapTypeHandlers, opts.mapTypesSel);
        const map = {
          setMapType() {},
          redrawMap() {},
          redrawCount: 0
        };
        map.setMapType = () => {
          map.redrawCount += 1;
        };
        map.redrawMap = () => {
          map.redrawCount += 1;
        };
        createdMaps.push(map);
        return map;
      }
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const speciesCode = new URL(url).searchParams.get('taxon_identifier[eq]');
      return {
        ok: true,
        json: async () => ({ data: [{ grid_ref_2km: speciesCode === 'XYZ999' ? 'SJ99A' : 'SJ58D' }] })
      };
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'switch',
      area: 'vc-58',
      taxonId: 'ABC123',
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const leafletInput = element.querySelector('input[type="radio"][value="leaflet"]');
    leafletInput.checked = true;
    leafletInput.dispatchEvent(new Event('change', { bubbles: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(createdMaps).toHaveLength(2);
    expect(createdMaps[1].redrawCount).toBeGreaterThan(0);

    taxonIdSource.remove();
  });

  it('re-renders the species map after a taxonIdSource species selection', async () => {
    const requestedSpecies = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType() {},
        redrawMap() {}
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      requestedSpecies.push(speciesCode);

      return {
        ok: true,
        json: async () => ({ data: [{ grid_ref_2km: speciesCode === 'XYZ999' ? 'SJ99A' : 'SJ58D' }] })
      };
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'control';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123',
      taxonIdSource: 'control'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedSpecies).toEqual(['ABC123', 'XYZ999']);

    taxonIdSource.remove();
  });

  it('keeps the latest taxonIdSource species selection when a control-block area change re-renders the map', async () => {
    const requestedSpecies = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType() {},
        redrawMap() {}
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      requestedSpecies.push(speciesCode);

      return {
        ok: true,
        json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
      };
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'control';
    document.body.appendChild(controlElement);

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-control';
    document.body.appendChild(taxonIdSource);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123',
      control: 'control',
      taxonIdSource: 'linked-control'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    publishControlEvent('control', { type: 'area-change', area: 'vc-59' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedSpecies.at(-1)).toBe('XYZ999');

    controlElement.remove();
    taxonIdSource.remove();
  });

  it('prefers the current control dataset over stale area-change events from the control bus', async () => {
    const requestedUrls = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType() {},
        redrawMap() {}
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'control';
    controlElement.dataset.visArea = 'vc-58';
    document.body.appendChild(controlElement);

    publishControlEvent('control', { type: 'area-change', area: 'vc-59' });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-59',
      taxonId: 'ABC123',
      control: 'control'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedUrls.at(-1)).toContain('higher_geography_identifier%5Beq%5D=58');

    controlElement.remove();
  });

  it('uses control-driven vc values to filter occurrences by the corresponding higher geography identifier', async () => {
    const requestedUrls = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType() {},
        redrawMap() {}
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        json: async () => ({ data: [] })
      };
    });

    const controlElement = document.createElement('div');
    controlElement.id = 'control';
    controlElement.dataset.visArea = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-all',
      taxonId: 'ABC123',
      control: 'control'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    publishControlEvent('control', { type: 'area-change', area: 'vc-58' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedUrls.at(-1)).toContain('higher_geography_identifier%5Beq%5D=58');

    controlElement.remove();
  });

  it('keeps linked-table updates working after a control-driven re-render', async () => {
    const requestedSpecies = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType() {},
        redrawMap() {}
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      requestedSpecies.push(speciesCode);

      return {
        ok: true,
        json: async () => ({ data: [{ grid_ref_2km: speciesCode === 'XYZ999' ? 'SJ99A' : 'SJ58D' }] })
      };
    });

    const taxonIdSource = document.createElement('div');
    taxonIdSource.id = 'linked-table';
    document.body.appendChild(taxonIdSource);

    const controlElement = document.createElement('div');
    controlElement.id = 'control';
    controlElement.dataset.visArea = 'vc-58';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      taxonId: 'ABC123',
      control: 'control',
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    controlElement.dataset.visArea = 'vc-59';
    publishControlEvent('control', { type: 'area-change', area: 59 });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedSpecies[0]).toBe('ABC123');
    expect(requestedSpecies[requestedSpecies.length - 1]).toBe('XYZ999');
    expect(requestedSpecies.length).toBeGreaterThanOrEqual(3);

    taxonIdSource.remove();
    controlElement.remove();
  });
});
