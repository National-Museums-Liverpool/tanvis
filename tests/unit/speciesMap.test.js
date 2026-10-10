import * as d3 from 'd3';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { createOccurrenceData, applyOccurrenceDataToMap } from '../../src/adapters/speciesMap.js';
import { renderSpeciesMap } from '../../src/renderers/speciesMap.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

function mockSpeciesTaxonInfoResponse(url) {
  if (!new URL(url).pathname.includes('/taxa/')) {
    return null;
  }

  return {
    ok: true,
    json: async () => ({
      data: {
        taxon_rank__rank: 'Species',
        taxon__scientific_name: 'Test species'
      }
    })
  };
}

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
    document.querySelectorAll('[data-busy-indicator-test]').forEach((node) => node.remove());
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
      region: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.textContent).toContain('D3 is not available');
    expect(element.textContent).toContain('d3.v7.min.js');
  });

  it.each([
    ['static', 'svgMap', 'svg'],
    ['leaflet', 'leafletMap', 'leafletMap']
  ])('centers the busy indicator over the %s map surface while data loads', async (mapType, backendName, surfaceTag) => {
    const taxonIdentifier = 'BUSY-OVERLAY-TEST-TAXON';
    let resolveTaxonResponse;
    let resolveOccurrencesResponse;
    window.brcatlas = {
      [backendName]: (options) => {
        const mapContainer = document.querySelector(options.selector);
        const surface = document.createElement(surfaceTag);
        if (surfaceTag === 'leafletMap') {
          surface.id = 'leafletMap';
        }
        surface.getBoundingClientRect = () => ({ left: 70, top: 40, width: 300, height: 180 });
        mapContainer.getBoundingClientRect = () => ({ left: 0, top: 0, width: 720, height: 320 });
        mapContainer.appendChild(surface);
        return { setMapType() {}, redrawMap() {} };
      }
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname.endsWith(`/taxa/${taxonIdentifier}`)) {
        return new Promise((resolve) => { resolveTaxonResponse = resolve; });
      }
      if (parsedUrl.pathname.endsWith('/occurrences') && parsedUrl.searchParams.get('taxon_identifier[eq]') === taxonIdentifier) {
        return new Promise((resolve) => { resolveOccurrencesResponse = resolve; });
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) });
    });

    const element = document.createElement('div');
    element.dataset.busyIndicatorTest = '';
    document.body.appendChild(element);
    renderSpeciesMap(element, {
      type: 'species-map',
      mapType,
      region: 'vc-58',
      taxonId: taxonIdentifier
    });

    const indicator = element.querySelector('[data-tanvis-map-loading]');
    expect(indicator).not.toBeNull();
    expect(indicator.getAttribute('role')).toBe('status');
    expect(indicator.textContent).toBe('Loading map data...');
    expect(indicator.dataset.mapTarget).toBe(surfaceTag === 'leafletMap' ? 'leafletMap' : 'svg');
    expect(indicator.style.left).toBe('70px');
    expect(indicator.style.top).toBe('40px');
    expect(indicator.style.width).toBe('300px');
    expect(indicator.style.height).toBe('180px');

    await vi.waitFor(() => expect(resolveTaxonResponse).toBeTypeOf('function'));
    resolveTaxonResponse({
      ok: true,
      json: async () => ({ data: { taxon_rank__rank: 'Species', taxon__scientific_name: 'Test species' } })
    });

    await vi.waitFor(() => expect(resolveOccurrencesResponse).toBeTypeOf('function'));
    expect(element.querySelector('[data-tanvis-map-loading]')).not.toBeNull();
    resolveOccurrencesResponse({
      ok: true,
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58D' }] })
    });

    await vi.waitFor(() => expect(element.querySelector('[data-tanvis-map-loading]')).toBeNull());
  });

  it('uses the exact taxon identifier for Species occurrences', async () => {
    window.brcatlas = {
      svgMap: () => ({ setMapType() {}, redrawMap() {} })
    };
    const requestedUrls = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      requestedUrls.push(parsedUrl);
      return {
        ok: true,
        json: async () => parsedUrl.pathname.endsWith('/taxa/ABC123')
          ? { data: { taxon_rank__rank: 'Species', taxon__scientific_name: 'Culex pipiens' } }
          : { data: [] }
      };
    });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-58',
      taxonId: 'ABC123'
    });

    await vi.waitFor(() => {
      expect(element.__tanvisSpeciesRank).toBe('Species');
    });

    const rankUrl = requestedUrls.find((url) => url.pathname.endsWith('/taxa/ABC123'));
    expect(rankUrl.searchParams.get('include')).toBe('taxon-rank');
    await vi.waitFor(() => {
      expect(requestedUrls.some((url) => url.pathname.endsWith('/occurrences'))).toBe(true);
    });
    const occurrencesUrl = requestedUrls.find((url) => url.pathname.endsWith('/occurrences'));
    expect(occurrencesUrl.searchParams.get('taxon_identifier[eq]')).toBe('ABC123');
    expect(occurrencesUrl.searchParams.get('include')).toBeNull();
  });

  it('queries occurrence descendants by the selected higher taxon scientific name', async () => {
    window.brcatlas = {
      svgMap: () => ({ setMapType() {}, redrawMap() {} })
    };
    const requestedUrls = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      requestedUrls.push(parsedUrl);
      return {
        ok: true,
        json: async () => parsedUrl.pathname.endsWith('/taxa/ABC123')
          ? { data: { taxon_rank__rank: 'Family', taxon__scientific_name: 'Culicidae' } }
          : { data: [] }
      };
    });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-58',
      taxonId: 'ABC123'
    });

    await vi.waitFor(() => {
      expect(requestedUrls.some((url) => url.pathname.endsWith('/occurrences'))).toBe(true);
    });

    const occurrencesUrl = requestedUrls.find((url) => url.pathname.endsWith('/occurrences'));
    expect(occurrencesUrl.searchParams.get('taxon_identifier[eq]')).toBeNull();
    expect(occurrencesUrl.searchParams.get('include')).toBe('taxon,parent-taxa');
    expect(occurrencesUrl.searchParams.get('family__scientific_name')).toBe('Culicidae');
    expect(occurrencesUrl.searchParams.get('higher_geography_identifier[eq]')).toBe('58');
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

  it.each([
    ['static', 'svgMap'],
    ['leaflet', 'leafletMap']
  ])('emits a tetrad-clicked event for a %s map with the current taxon id', (mapType, backendName) => {
    let mapOptions;
    window.brcatlas = {
      [backendName]: (options) => {
        mapOptions = options;
        return { setMapType() {}, redrawMap() {} };
      }
    };

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-58',
      mapType,
      taxonId: 'ABC123'
    });

    const eventHandler = vi.fn();
    element.addEventListener('tetrad-clicked', eventHandler);
    element.dataset.visTaxonid = 'XYZ999';
    mapOptions.onclick('SJ58D', 'ignored-id', 'ignored-caption');

    expect(eventHandler).toHaveBeenCalledOnce();
    expect(eventHandler.mock.calls[0][0].detail).toEqual({
      gridReference: 'SJ58D',
      taxonId: 'XYZ999'
    });
  });

  it('does not recreate the map when the control bus reports the same normalized region', () => {
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
      region: 'vc-59',
      taxonId: 'ABC123',
      control: 'control-block'
    });

    publishControlEvent('control-block', {
      type: 'region-change',
      region: 59
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
      region: 'vc-58',
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

  it('uses the most recently available occurrence data while a new region fetch is pending', async () => {
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
      const taxonInfoResponse = mockSpeciesTaxonInfoResponse(url);
      if (taxonInfoResponse) {
        return taxonInfoResponse;
      }

      const region = new URL(url).searchParams.get('higher_geography_identifier[eq]');
      if (region === '58') {
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
      region: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    let payload = await mapTypeHandlers.occurrences();
    expect(payload.records[0]).toMatchObject({ gr: 'SJ58D', val: 1 });

    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-59',
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
      region: 'vc-58',
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
      region: 'vc-58',
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
      region: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'leaflet',
      region: 'vc-58',
      taxonId: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(element.querySelector('input[type="radio"][value="static"]')).not.toBeNull();
    expect(element.querySelector('input[type="radio"][value="leaflet"]')).not.toBeNull();
  });

  it('reuses fetched occurrence rows when switching map backends', async () => {
    const createdMaps = [];
    const requestedUrls = [];
    const createMap = () => {
      const map = {
        setMapType() {},
        redrawMap() {},
        redrawCount: 0
      };
      map.setMapType = () => { map.redrawCount += 1; };
      map.redrawMap = () => { map.redrawCount += 1; };
      createdMaps.push(map);
      return map;
    };

    window.brcatlas = {
      svgMap: () => createMap(),
      leafletMap: () => createMap()
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      requestedUrls.push(parsedUrl);
      return {
        ok: true,
        json: async () => parsedUrl.pathname.includes('/taxa/')
          ? { data: { taxon_rank__rank: 'Species', taxon__scientific_name: 'Test species' } }
          : { data: [{ grid_ref_2km: 'SJ58D' }] }
      };
    });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'switch',
      region: 'vc-58',
      taxonId: 'CACHE-TEST-TAXON'
    });

    await vi.waitFor(() => {
      expect(requestedUrls.filter((url) => url.pathname.endsWith('/occurrences') && url.searchParams.get('taxon_identifier[eq]') === 'CACHE-TEST-TAXON')).toHaveLength(1);
      expect(element.__tanvisSpeciesMapOccurrenceContext?.speciesCode).toBe('CACHE-TEST-TAXON');
      expect(createdMaps[0].redrawCount).toBeGreaterThan(0);
    });

    const leafletInput = element.querySelector('input[type="radio"][value="leaflet"]');
    leafletInput.checked = true;
    leafletInput.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => expect(createdMaps).toHaveLength(2));

    expect(createdMaps[1].redrawCount).toBeGreaterThan(0);
    expect(requestedUrls.filter((url) => url.pathname.endsWith('/taxa/CACHE-TEST-TAXON'))).toHaveLength(1);
    expect(requestedUrls.filter((url) => url.pathname.endsWith('/occurrences') && url.searchParams.get('taxon_identifier[eq]') === 'CACHE-TEST-TAXON')).toHaveLength(1);
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
      const taxonInfoResponse = mockSpeciesTaxonInfoResponse(parsedUrl);
      if (taxonInfoResponse) {
        return taxonInfoResponse;
      }

      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      if (speciesCode) {
        requestedSpecies.push(speciesCode);
      }

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
      region: 'vc-58',
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
      region: 'vc-58',
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
      const parsedUrl = new URL(url);
      const taxonInfoResponse = mockSpeciesTaxonInfoResponse(parsedUrl);
      if (taxonInfoResponse) {
        return taxonInfoResponse;
      }

      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
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
      region: 'vc-58',
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
      const taxonInfoResponse = mockSpeciesTaxonInfoResponse(parsedUrl);
      if (taxonInfoResponse) {
        return taxonInfoResponse;
      }

      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      if (speciesCode) {
        requestedSpecies.push(speciesCode);
      }

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
      region: 'vc-58',
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

  it('keeps the latest taxonIdSource species selection when a control-block region change re-renders the map', async () => {
    const requestedSpecies = [];

    window.brcatlas = {
      svgMap: () => ({
        setMapType() {},
        redrawMap() {}
      })
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const parsedUrl = new URL(url);
      const taxonInfoResponse = mockSpeciesTaxonInfoResponse(parsedUrl);
      if (taxonInfoResponse) {
        return taxonInfoResponse;
      }

      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      if (speciesCode) {
        requestedSpecies.push(speciesCode);
      }

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
      region: 'vc-58',
      taxonId: 'ABC123',
      control: 'control',
      taxonIdSource: 'linked-control'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    taxonIdSource.dispatchEvent(new CustomEvent('taxon-identified', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    publishControlEvent('control', { type: 'region-change', region: 'vc-59' });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requestedSpecies.at(-1)).toBe('XYZ999');

    controlElement.remove();
    taxonIdSource.remove();
  });

  it('prefers the current control dataset over stale region-change events from the control bus', async () => {
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
    controlElement.dataset.visRegion = 'vc-58';
    document.body.appendChild(controlElement);

    publishControlEvent('control', { type: 'region-change', region: 'vc-59' });

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-59',
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
    controlElement.dataset.visRegion = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-all',
      taxonId: 'ABC123',
      control: 'control'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    publishControlEvent('control', { type: 'region-change', region: 'vc-58' });

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
      const taxonInfoResponse = mockSpeciesTaxonInfoResponse(parsedUrl);
      if (taxonInfoResponse) {
        return taxonInfoResponse;
      }

      const speciesCode = parsedUrl.searchParams.get('taxon_identifier[eq]');
      if (speciesCode) {
        requestedSpecies.push(speciesCode);
      }

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
    controlElement.dataset.visRegion = 'vc-58';
    controlElement.dataset.visTaxonGroup = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      region: 'vc-58',
      taxonId: 'ABC123',
      control: 'control',
      taxonIdSource: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    controlElement.dataset.visRegion = 'vc-59';
    publishControlEvent('control', { type: 'region-change', region: 59 });

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
