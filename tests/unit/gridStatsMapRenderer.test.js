import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderGridStatsMap } from '../../src/renderers/gridStatsMap.js';

describe('renderGridStatsMap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete window.brcatlas;
  });

  it('uses setMapType and redrawMap when switching to Species without recreating map', async () => {
    const svgMapCalls = [];
    const setMapTypeCalls = [];
    let redrawCalls = 0;

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          setMapType: (value) => setMapTypeCalls.push(value),
          redrawMap: () => {
            redrawCalls += 1;
          }
        };
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            square: 'SJ58'
          }
        ]
      })
    });

    const element = document.createElement('div');
    renderGridStatsMap(element, {
      type: 'grid-stats-map',
      mapType: 'static',
      area: 'vc-58',
      gridStatsType: 'switch'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].mapTypesKey).toBe('grid-stats-records');

    const speciesInput = element.querySelector('input[type="radio"][value="species"]');
    expect(speciesInput).not.toBeNull();

    speciesInput.checked = true;
    speciesInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(setMapTypeCalls).toEqual(['grid-stats-species']);
    expect(redrawCalls).toBe(2);
    expect(svgMapCalls).toHaveLength(1);
  });

  it('hides the switch and defaults mapTypesKey to species when gridStatsType is species', async () => {
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const element = document.createElement('div');
    renderGridStatsMap(element, {
      type: 'grid-stats-map',
      mapType: 'static',
      area: 'vc-58',
      gridStatsType: 'species'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].mapTypesKey).toBe('grid-stats-species');
    expect(element.querySelector('.tanvis-grid-stats-switch')).toBeNull();
  });

  it('supports mapType switch with initial static render and toggles to leaflet without refetching', async () => {
    const svgMapCalls = [];
    const leafletMapCalls = [];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            square: 'SJ58',
            occurrences_count: 12,
            species_count: 4
          }
        ]
      })
    });

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          setMapType: () => {},
          redrawMap: () => {}
        };
      },
      leafletMap: (opts) => {
        leafletMapCalls.push(opts);
        return {
          lmap: {
            setView: () => {}
          },
          setMapType: () => {},
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderGridStatsMap(element, {
      type: 'grid-stats-map',
      mapType: 'switch',
      area: 'vc-58',
      gridStatsType: 'switch'
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(svgMapCalls).toHaveLength(1);
    expect(leafletMapCalls).toHaveLength(0);

    const controls = element.querySelector('.tanvis-grid-stats-map-controls');
    expect(controls).not.toBeNull();
    expect(controls.children[0].classList.contains('tanvis-grid-stats-map-type-switch')).toBe(true);
    expect(controls.children[1].classList.contains('tanvis-grid-stats-switch')).toBe(true);

    const leafletInput = element.querySelector('input[type="radio"][value="leaflet"]');
    expect(leafletInput).not.toBeNull();
    leafletInput.checked = true;
    leafletInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(svgMapCalls).toHaveLength(1);
    expect(leafletMapCalls).toHaveLength(1);
    expect(leafletMapCalls[0].mapTypesKey).toBe('grid-stats-records');
  });
});
