import { clearElement } from '../utils/dom.js';
import { createAreaControls } from '../controls/areaControls.js';
import { transOptsSel } from './transOptsSel.js';

// Wrapper to adapt BRC Atlas maps for use in Tanvis.
// This allows users to specify BRC Atlas maps as a visualization 
// type in their HTML, and have them rendered using the BRC Atlas library.

let mapIdCounter = 0;

export function createBrcAtlasAdapter() {
  return {
    name: 'static-map',
    render(element, config) {
      const brcAtlas = getBrcAtlasGlobal();

      if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
        throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
      }

      if (!element.id) {
        mapIdCounter += 1;
        element.id = `tanvis-map-${mapIdCounter}`;
      }

      clearElement(element);

      console.log('Creating BRC Atlas map with config:', config);

      const map = brcAtlas.svgMap(createMapOptions(element, config));

      if (map && typeof map.setIdentfier === 'function' && config.source) {
        map.setIdentfier(config.source);
      }

      if (map && typeof map.redrawMap === 'function') {
        map.redrawMap();
      }

      if (config.ctl) {
        element.appendChild(createAreaControls({
          element,
          selectedValue: config.area,
          onAreaChange: (value) => {
            createBrcAtlasAdapter().render(element, {
              ...config,
              area: value
            });
          }
        }));
      }

      return map;
    }
  };
}

function createMapOptions(element, config) {
  const includeHectads = config.hectads !== false;
  const shouldExpand = config.expand === true;
  const width = parseOptionalPositiveNumber(config.width);
  const explicitHeight = parseOptionalPositiveNumber(config.height);
  const selectedBounds = transOptsSel[config.area]?.bounds;
  // For static maps, width is derived from transOpts. If data-vis-height is provided,
  // use it directly; otherwise fall back to calculating height from data-vis-width.
  const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);

  return {
    selector: `#${element.id}`,
    transOptsControl: config.ctl,
    transOptsSel,
    transOptsKey: config.area,
    transOptsControl: false, // We create our own custom control for area selection, so disable the built-in one.
    boundaryGjson: `/data/vcs/simp-100/${config.area}-100.geojson`, 
    // Static map width is determined by the selected transOpts bounds, so only height is passed through.
    ...(height !== undefined ? { height } : {}),
    ...(shouldExpand ? { expand: true } : {}),
    ...(includeHectads
      ? { gridGjson: `/data/vcs/hectad-grids/${config.area}-hectads.geojson` }
      : { gridLineStyle: 'none' })
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
