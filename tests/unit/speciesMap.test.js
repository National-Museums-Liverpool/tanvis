import * as d3 from 'd3';
import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { createOccurrenceData, applyOccurrenceDataToMap } from '../../src/adapters/speciesMap.js';
import { renderSpeciesMap } from '../../src/renderers/speciesMap.js';

describe('species map redraw flow', () => {
  beforeEach(() => {
    globalThis.d3 = d3;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.brcatlas;
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

    applyOccurrenceDataToMap(map, [{ grid_ref_2km: 'SJ58' }]);

    expect(calls).toEqual([
      ['setMapType', 'occurrences'],
      ['redrawMap']
    ]);
  });

  it('uses the latest occurrence rows in the occurrences adapter', async () => {
    applyOccurrenceDataToMap({ setMapType() {}, redrawMap() {} }, [{ grid_ref_2km: 'SJ58' }]);

    //const adapter = createOccurrenceData();
    //const payload = await adapter();
    const payload = await createOccurrenceData();

    expect(payload.records[0]).toMatchObject({
      gr: 'SJ58',
      val: 1,
      caption: 'SJ58: 1 records'
    });
  });

  it('ignores rows without grid_ref_2km', async () => {
    applyOccurrenceDataToMap({ setMapType() {}, redrawMap() {} }, [{ grid_square: 'SJ58' }]);

    //const adapter = createOccurrenceData();
    //const payload = await adapter();
    const payload = await createOccurrenceData();

    expect(payload.records).toEqual([]);
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
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58' }] })
    });

    const element = document.createElement('div');
    element.dataset.visDotColour = 'orange';
    element.dataset.visTransformation = 'sqrt';
    element.dataset.visDotShape = 'triangle';

    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      species: 'ABC123'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = await mapTypeHandlers.occurrences();

    expect(payload.shape).toBe('triangle');
    expect(payload.opacity).toBe(1);
    expect(payload.records[0]).toMatchObject({
      gr: 'SJ58',
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
      json: async () => ({ data: [{ grid_ref_2km: 'SJ58' }] })
    });

    const element = document.createElement('div');
    element.dataset.visDotColour = 'orange';
    element.dataset.visTransformation = 'sqrt';
    element.dataset.visDotShape = 'triangle';

    renderSpeciesMap(element, {
      type: 'species-map',
      mapType: 'switch',
      area: 'vc-58',
      species: 'ABC123'
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
        ? [{ grid_ref_2km: 'SJ99' }]
        : [{ grid_ref_2km: 'SJ58' }];

      return {
        ok: true,
        json: async () => ({ data: payloadRows })
      };
    });

    const linkedTable = document.createElement('div');
    linkedTable.id = 'linked-table';
    document.body.appendChild(linkedTable);

    const element = document.createElement('div');
    renderSpeciesMap(element, {
      type: 'species-map',
      area: 'vc-58',
      species: 'ABC123',
      linkedTable: 'linked-table'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    linkedTable.dispatchEvent(new CustomEvent('species-row-selected', {
      detail: { speciesId: 'XYZ999' }
    }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    const payload = await mapTypeHandlers.occurrences();

    expect(requestedSpecies).toEqual(['ABC123', 'XYZ999']);
    expect(payload.records[0]).toMatchObject({ gr: 'SJ99', val: 1 });

    linkedTable.remove();
  });
});
