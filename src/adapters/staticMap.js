import { clearElement } from '../utils/dom.js';
import { createControlsPanel } from '../controls/panel.js';
import { createRadioGroup } from '../controls/radioGroup.js';
import { transOptsSel } from './transOptsSel.js';

// Wrapper to adapt BRC Atlas maps for use in Tanvis.
// This allows users to specify BRC Atlas maps as a visualization 
// type in their HTML, and have them rendered using the BRC Atlas library.

let mapIdCounter = 0;
const areaOptions = [
  { label: 'vc58', value: 'vc-58' },
  { label: 'vc59', value: 'vc-59' },
  { label: 'vc60', value: 'vc-60' },
  { label: 'all', value: 'vc-58-59-60' }
];

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
        element.appendChild(createAreaControls(element, config));
      }

      return map;
    }
  };
}

function createMapOptions(element, config) {
  const includeHectads = config.hectads !== false;
  const shouldExpand = config.expand === true;
  const width = parseOptionalPositiveNumber(config.width);
  const selectedBounds = transOptsSel[config.area]?.bounds;
  const height = calculateHeightFromBounds(width, selectedBounds);

  return {
    selector: `#${element.id}`,
    transOptsControl: config.ctl,
    transOptsSel,
    transOptsKey: config.area,
    transOptsControl: false, // We create our own custom control for area selection, so disable the built-in one.
    boundaryGjson: `/data/vcs/simp-100/${config.area}-100.geojson`, 
    ...(width !== undefined ? { width } : {}),
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

function createAreaControls(element, config) {
  const { panel, body } = createControlsPanel({
    label: 'Data options',
    ariaLabel: 'Toggle map controls'
  });
  panel.dataset.tanvisControls = 'area';

  const groupName = `${element.id}-area`;
  const group = createRadioGroup({
    name: groupName,
    selectedValue: config.area,
    items: areaOptions,
    onChange: (value) => {
      element.dataset.visArea = value;
      createBrcAtlasAdapter().render(element, {
        ...config,
        area: value
      });
    }
  });

  body.appendChild(group);

  return panel;
}

function getBrcAtlasGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.brcatlas || null;
}
