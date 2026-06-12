import { clearElement } from '../utils/dom.js';
import { transOptsSel } from './transOptsSel.js';

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

      const map = brcAtlas.leafletMap(createMapOptions(element, config));

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

function createMapOptions(element, config) {
  const width = parseOptionalPositiveNumber(config.width);
  const selectedBounds = transOptsSel[config.area]?.bounds;
  const height = calculateHeightFromBounds(width, selectedBounds);

  return {
    selector: `#${element.id}`,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
    ...(config.expand === true ? { expand: true } : {})
  };
}

function parseOptionalPositiveNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

function calculateHeightFromBounds(width, bounds) {
  if (width === undefined || !bounds) {
    return undefined;
  }

  const boxWidth = bounds.xmax - bounds.xmin;
  const boxHeight = bounds.ymax - bounds.ymin;
  if (boxWidth <= 0 || boxHeight <= 0) {
    return undefined;
  }

  return Math.round(width * (boxHeight / boxWidth));
}

function getBrcAtlasGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.brcatlas || null;
}
