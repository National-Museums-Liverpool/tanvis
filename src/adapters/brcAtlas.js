import { clearElement } from '../utils/dom.js';
import { createControlsPanel } from '../controls/panel.js';
import { createRadioGroup } from '../controls/radioGroup.js';

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
    name: 'brc-atlas',
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

  return {
    selector: `#${element.id}`,
    transOptsControl: config.ctl,
    transOptsSel: {
      // Custom transOptsSel to define different views for
      // the three different VCs in the Cheshire/Lancashire area
      // and a combined view for all of them together.
      'vc-58-59-60': {
        id: 'vc-58-59-60',
        caption: 'Cheshire Lancashire VCs',
        bounds: {
          xmin: 302500,
          ymin: 325000,
          xmax: 425000,
          ymax: 495000
        },
      },
      'vc-58': {
        id: 'vc-58',
        caption: 'Cheshire (58)',
        bounds: {
          xmin: 305000,
          ymin: 325000,
          xmax: 425000,
          ymax: 415000
        }
      },
      'vc-59': {
        id: 'vc-59',
        caption: 'South Lancashire (59)',
        bounds: {
          xmin: 315000,
          ymin: 375000,
          xmax: 405000,
          ymax: 455000
        }
      },
      'vc-60': {
        id: 'vc-60',
        caption: 'West Lancashire (60)',
        bounds: {
          xmin: 315000,
          ymin: 415000,
          xmax: 385000,
          ymax: 495000
        }
      }
    },
    transOptsKey: config.area,
    transOptsControl: false, // We create our own custom control for area selection, so disable the built-in one.
    boundaryGjson: `/data/vcs/simp-100/${config.area}-100.geojson`, 
    ...(includeHectads
      ? { gridGjson: `/data/vcs/hectad-grids/${config.area}-hectads.geojson` }
      : { gridLineStyle: 'none' })
  };
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
