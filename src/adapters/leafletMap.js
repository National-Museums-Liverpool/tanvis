import { clearElement } from '../utils/dom.js';

// Wrapper to adapt BRC Atlas Leaflet maps for use in Tanvis.
// This allows users to specify Leaflet/slippy maps as a visualization 
// type in their HTML, and have them rendered using the BRC Atlas library.

let mapIdCounter = 0;

export function createLeafletMapAdapter() {
  return {
    name: 'leaflet-map',
    render(element, config) {
      const brcAtlas = getBrcAtlasGlobal();

      if (!brcAtlas || typeof brcAtlas.leafletMap !== 'function') {
        throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
      }

      if (!element.id) {
        mapIdCounter += 1;
        element.id = `tanvis-leaflet-map-${mapIdCounter}`;
      }

      clearElement(element);

      console.log('Creating BRC Atlas Leaflet map with config:', config);

      const map = brcAtlas.leafletMap({
        selector: `#${element.id}`
      });

      if (map && typeof map.setIdentfier === 'function' && config.source) {
        map.setIdentfier(config.source);
      }

      if (map && typeof map.redrawMap === 'function') {
        map.redrawMap();
      }

      return map;
    }
  };
}

function getBrcAtlasGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.brcatlas || null;
}
