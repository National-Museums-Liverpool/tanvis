import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { renderStaticMap } from '../../src/renderers/map.js';
import { renderLeafletMap } from '../../src/renderers/leafletMap.js';
import { publishControlEvent } from '../../src/controls/controlBus.js';

describe('renderStaticMap', () => {
  it('calls brc-atlas svgMap and responds to control-block area changes', () => {
    const setIdentfierCalls = [];
    const redrawCalls = [];
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          setIdentfier: (value) => setIdentfierCalls.push(value),
          redrawMap: () => redrawCalls.push(true)
        };
      }
    };

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-static';
    controlElement.dataset.visArea = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    const config = {
      type: 'map',
      area: '',
      control: 'vc-control-static'
    };

    renderStaticMap(element, config);

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].selector).toMatch(/^#tanvis-map-/);
    expect(svgMapCalls[0].transOptsControl).toBe(false);
    expect(svgMapCalls[0].transOptsKey).toBe('vc-all');
    expect(svgMapCalls[0].gridGjson).toBe('/data/vcs/hectad-grids/vc-all-hectads.geojson');
    expect(svgMapCalls[0].gridLineStyle).toBeUndefined();
    expect(setIdentfierCalls).toEqual([]);
    expect(redrawCalls).toHaveLength(1);

    publishControlEvent('vc-control-static', {
      type: 'area-change',
      area: 59
    });

    expect(element.dataset.visArea).toBe('59');
    expect(svgMapCalls).toHaveLength(2);
    expect(svgMapCalls[1].transOptsKey).toBe('vc-59');
    expect(svgMapCalls[1].boundaryGjson).toBe('/data/vcs/simp-100/vc-59-100.geojson');
    expect(redrawCalls).toHaveLength(2);
  });

  it('omits gridGjson when hectads is false', () => {
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderStaticMap(element, {
      type: 'map',
      area: 'vc-58',
      ctl: false,
      hectads: false
    });

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].gridGjson).toBeUndefined();
    expect(svgMapCalls[0].gridLineStyle).toBe('none');
    expect(svgMapCalls[0].boundaryGjson).toBe('/data/vcs/simp-100/vc-58-100.geojson');
  });

  it('passes calculated height but not width when width is provided', () => {
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderStaticMap(element, {
      type: 'map',
      area: 'vc-60',
      ctl: false,
      width: 700
    });

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].width).toBeUndefined();
    expect(svgMapCalls[0].height).toBe(800);
  });

  it('uses explicit height when width and height are both provided', () => {
    const svgMapCalls = [];

    window.brcatlas = {
      svgMap: (opts) => {
        svgMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderStaticMap(element, {
      type: 'map',
      area: 'vc-60',
      ctl: false,
      width: 700,
      height: 555
    });

    expect(svgMapCalls).toHaveLength(1);
    expect(svgMapCalls[0].width).toBeUndefined();
    expect(svgMapCalls[0].height).toBe(555);
  });
});

describe('renderLeafletMap', () => {
  beforeEach(() => {
    window.L = {};
  });

  afterEach(() => {
    delete window.L;
  });

  it('shows a clear error when Leaflet is not available', () => {
    const element = document.createElement('div');
    delete window.L;
    window.brcatlas = {
      leafletMap: () => ({ lmap: {}, redrawMap: () => {} })
    };

    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59'
    });

    expect(element.textContent).toContain('Leaflet is not available');
    expect(element.textContent).toContain('leaflet.js');
  });

  it('shows an info message when Leaflet CSS is missing', () => {
    const element = document.createElement('div');
    Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => link.remove());
    window.L = {};
    window.brcatlas = {
      leafletMap: () => ({ lmap: {}, redrawMap: () => {} })
    };

    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59'
    });

    expect(element.textContent).toContain('Leaflet stylesheet');
    expect(element.textContent).toContain('leaflet.css');
  });

  it('responds to control-block area changes', () => {
    const leafletMapCalls = [];
    const setViewCalls = [];

    window.brcatlas = {
      leafletMap: (opts) => {
        leafletMapCalls.push(opts);
        return {
          lmap: {
            setView: (coords, zoom) => setViewCalls.push({ coords, zoom })
          },
          redrawMap: () => {}
        };
      }
    };

    const controlElement = document.createElement('div');
    controlElement.id = 'vc-control-leaflet';
    controlElement.dataset.visArea = '';
    document.body.appendChild(controlElement);

    const element = document.createElement('div');
    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: '',
      control: 'vc-control-leaflet'
    });

    expect(leafletMapCalls).toHaveLength(1);
    expect(setViewCalls[0]).toEqual({ coords: [53.585317, -2.549048], zoom: 8 });

    publishControlEvent('vc-control-leaflet', {
      type: 'area-change',
      area: 59
    });

    expect(element.dataset.visArea).toBe('59');
    expect(leafletMapCalls).toHaveLength(1);
    expect(setViewCalls[1]).toEqual({ coords: [53.629982, -2.606334], zoom: 9 });

    publishControlEvent('vc-control-leaflet', {
      type: 'area-change',
      area: 58
    });
    expect(setViewCalls[2]).toEqual({ coords: [53.225875, -2.525714], zoom: 9 });

    publishControlEvent('vc-control-leaflet', {
      type: 'area-change',
      area: 60
    });
    expect(setViewCalls[3]).toEqual({ coords: [53.988606, -2.764047], zoom: 9 });

    publishControlEvent('vc-control-leaflet', {
      type: 'area-change',
      area: ''
    });
    expect(setViewCalls[4]).toEqual({ coords: [53.585317, -2.549048], zoom: 8 });
  });

  it('pans to the selected area centroid on initial render', () => {
    const setViewCalls = [];

    window.brcatlas = {
      leafletMap: () => ({
        lmap: {
          setView: (coords, zoom) => setViewCalls.push({ coords, zoom })
        },
        redrawMap: () => {}
      })
    };

    const element = document.createElement('div');
    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59'
    });

    expect(setViewCalls).toEqual([{ coords: [53.629982, -2.606334], zoom: 9 }]);
  });

  it('passes width and calculated height when width is provided', () => {
    const leafletMapCalls = [];

    window.brcatlas = {
      leafletMap: (opts) => {
        leafletMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59',
      width: 630
    });

    expect(leafletMapCalls).toHaveLength(1);
    expect(leafletMapCalls[0].width).toBe(630);
    expect(leafletMapCalls[0].height).toBe(560);
    expect(leafletMapCalls[0].showVcs).toBe(false);
  });

  it('passes explicit width and height independently when both are provided', () => {
    const leafletMapCalls = [];

    window.brcatlas = {
      leafletMap: (opts) => {
        leafletMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59',
      width: 630,
      height: 410
    });

    expect(leafletMapCalls).toHaveLength(1);
    expect(leafletMapCalls[0].width).toBe(630);
    expect(leafletMapCalls[0].height).toBe(410);
  });

  it('uses parent width when expand is true', () => {
    const leafletMapCalls = [];

    window.brcatlas = {
      leafletMap: (opts) => {
        leafletMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const parent = document.createElement('div');
    const element = document.createElement('div');
    parent.appendChild(element);

    let parentWidth = 900;
    Object.defineProperty(parent, 'clientWidth', {
      get() {
        return parentWidth;
      }
    });

    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59',
      width: 630,
      expand: true
    });

    expect(leafletMapCalls).toHaveLength(1);
    expect(leafletMapCalls[0].width).toBe(900);
    expect(leafletMapCalls[0].height).toBe(800);

    element.__tanvisExpandCleanup?.();
  });

  it('resizes expanded map using setSize and invalidateSize on window resize', () => {
    const setSizeCalls = [];
    const invalidateSizeCalls = [];

    window.brcatlas = {
      leafletMap: () => ({
        setSize: (width, height) => setSizeCalls.push({ width, height }),
        invalidateSize: () => invalidateSizeCalls.push(true),
        redrawMap: () => {}
      })
    };

    const parent = document.createElement('div');
    const element = document.createElement('div');
    parent.appendChild(element);

    let parentWidth = 500;
    Object.defineProperty(parent, 'clientWidth', {
      get() {
        return parentWidth;
      }
    });

    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-59',
      expand: true
    });

    parentWidth = 700;
    window.dispatchEvent(new Event('resize'));

    expect(setSizeCalls).toEqual([{ width: 700, height: 622 }]);
    expect(invalidateSizeCalls).toHaveLength(1);

    element.__tanvisExpandCleanup?.();
  });

  it('passes showVcs when boundaries is true', () => {
    const leafletMapCalls = [];

    window.brcatlas = {
      leafletMap: (opts) => {
        leafletMapCalls.push(opts);
        return {
          redrawMap: () => {}
        };
      }
    };

    const element = document.createElement('div');
    renderLeafletMap(element, {
      type: 'leaflet-map',
      area: 'vc-58',
      boundaries: true
    });

    expect(leafletMapCalls).toHaveLength(1);
    expect(leafletMapCalls[0].showVcs).toBe(true);
  });
});
