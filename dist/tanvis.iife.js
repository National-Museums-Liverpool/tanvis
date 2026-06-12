var Tanvis = (function (exports) {
  'use strict';

  function scan(root, selector = '.tanvis') {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return [];
    }

    return Array.from(root.querySelectorAll(selector));
  }

  function parseOptions(element) {
    const dataset = element?.dataset || {};

    return {
      type: dataset.visType || 'table',
      source: dataset.visSource,
      area: dataset.visArea || 'vc-58-59-60',
      ctl: parseBoolean(dataset.visCtl),
      hectads: parseBooleanDefaultTrue(dataset.visHectads)
    };
  }

  function parseBoolean(value) {
    return String(value).toLowerCase() === 'true';
  }

  function parseBooleanDefaultTrue(value) {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    return String(value).toLowerCase() === 'true';
  }

  function validateAttributes(config) {
    if (!config.type) {
      return ['Missing data-vis-type'];
    }

    return [];
  }

  const renderers = new Map();

  function registerRenderer(name, renderer) {
    renderers.set(name, renderer);
  }

  function getRenderer(name) {
    return renderers.get(name);
  }

  // The object 'dataset' is the standard browser API for HTML data-* attributes.
  // When code sets something like: element.dataset.tanvisRendered = 'true'
  // the browser reflects that as: data-tanvis-rendered="true" on the element in the DOM.

  function markRendered(element) {
    element.dataset.tanvisRendered = 'true';
  }

  function warn(message) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[tanvis] ${message}`);
    }
  }

  function render(element) {
    const config = parseOptions(element);
    const errors = validateAttributes(config);

    if (errors.length > 0) {
      warn(errors[0]);
      return { rendered: false, errors };
    }

    const renderer = getRenderer(config.type);

    if (!renderer) {
      warn(`No renderer registered for type "${config.type}"`);
      return { rendered: false, errors: [`No renderer registered for type "${config.type}"`] };
    }

    renderer(element, config);
    markRendered(element);

    return { rendered: true, errors: [] };
  }

  // Placeholder for Tabulator adapter.
  // This will allow users to specify Tabulator tables as a visualization 
  // type in their HTML, and have them rendered using the Tabulator library.  

  function createTabulatorAdapter() {
    return {
      name: 'tabulator',
      render() {
        throw new Error('Tabulator adapter not implemented yet');
      }
    };
  }

  const tableAdapter = createTabulatorAdapter();

  function renderTable(element, config) {
    tableAdapter.render(element, config);
  }

  // Wrapper to adapt BRC Charts for use in Tanvis.
  // This allows users to specify BRC Charts as a visualization 
  // type in their HTML, and have them rendered using the BRC Charts library.

  function createBrcChartsAdapter() {
    return {
      name: 'brc-charts',
      render() {
        throw new Error('BRC charts adapter not implemented yet');
      }
    };
  }

  const chartAdapter = createBrcChartsAdapter();

  function renderChart(element, config) {
    chartAdapter.render(element, config);
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  const SHARED_STYLES_ID = 'tanvis-shared-styles';
  const SHARED_STYLES = `
.tanvis-controls {
  width: 100%;
  margin-top: 0;
}

.tanvis-controls-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tanvis-controls-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  border: 1px solid #9ca3af;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1 system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
}

.tanvis-controls-toggle-label {
  line-height: 1;
}

.tanvis-controls-toggle:hover {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-toggle:focus-visible {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-toggle[aria-expanded="true"] {
  border-color: #6b7280;
  background: #6b7280;
  color: #ffffff;
}

.tanvis-controls-group {
  display: block;
}

.tanvis-controls-group[hidden] {
  display: none;
}

.tanvis-controls-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.tanvis-controls-option {
  position: relative;
  display: inline-flex;
}

.tanvis-controls-option + .tanvis-controls-option {
  margin-left: -1px;
}

.tanvis-controls-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.tanvis-controls-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 0;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  text-transform: lowercase;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-input:hover + .tanvis-controls-text {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-input:focus-visible + .tanvis-controls-text {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-input:checked + .tanvis-controls-text {
  border-color: #6b7280;
  background: #6b7280;
  color: #ffffff;
}

.tanvis-controls-input:disabled + .tanvis-controls-text {
  opacity: 0.6;
  cursor: not-allowed;
}
`;

  function ensureSharedStyles() {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(SHARED_STYLES_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = SHARED_STYLES_ID;
    style.textContent = SHARED_STYLES;
    document.head.appendChild(style);
  }

  function createControlsPanel(options = {}) {
    ensureSharedStyles();

    const label = options.label || 'Data options';
    const ariaLabel = options.ariaLabel || 'Toggle controls';
    const expanded = options.expanded !== false;

    const panel = document.createElement('div');
    panel.className = 'tanvis-controls';

    const header = document.createElement('div');
    header.className = 'tanvis-controls-header';
    panel.appendChild(header);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tanvis-controls-toggle';
    toggle.setAttribute('aria-label', ariaLabel);
    toggle.setAttribute('aria-expanded', String(expanded));
    header.appendChild(toggle);

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'tanvis-controls-toggle-icon';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = '⚙';

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'tanvis-controls-toggle-label';
    toggleLabel.textContent = label;

    toggle.appendChild(toggleIcon);
    toggle.appendChild(toggleLabel);

    const body = document.createElement('div');
    body.className = 'tanvis-controls-group';
    body.hidden = !expanded;
    panel.appendChild(body);

    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !isExpanded;
      toggle.setAttribute('aria-expanded', String(nextExpanded));
      body.hidden = !nextExpanded;
    });

    return { panel, body, toggle };
  }

  function createRadioGroup(options) {
    const group = document.createElement('div');
    group.className = options.groupClassName || 'tanvis-controls-options';

    for (const option of options.items || []) {
      const label = document.createElement('label');
      label.className = options.optionClassName || 'tanvis-controls-option';

      const input = document.createElement('input');
      input.className = options.inputClassName || 'tanvis-controls-input';
      input.type = 'radio';
      input.name = options.name;
      input.value = option.value;
      input.checked = options.selectedValue === option.value;
      input.addEventListener('change', () => {
        if (!input.checked || typeof options.onChange !== 'function') {
          return;
        }

        options.onChange(option.value);
      });

      const text = document.createElement('span');
      text.className = options.textClassName || 'tanvis-controls-text';
      text.textContent = option.label;

      label.appendChild(input);
      label.appendChild(text);
      group.appendChild(label);
    }

    return group;
  }

  // Wrapper to adapt BRC Atlas maps for use in Tanvis.
  // This allows users to specify BRC Atlas maps as a visualization 
  // type in their HTML, and have them rendered using the BRC Atlas library.

  let mapIdCounter$1 = 0;
  const areaOptions = [
    { label: 'vc58', value: 'vc-58' },
    { label: 'vc59', value: 'vc-59' },
    { label: 'vc60', value: 'vc-60' },
    { label: 'all', value: 'vc-58-59-60' }
  ];

  function createBrcAtlasAdapter() {
    return {
      name: 'brc-atlas',
      render(element, config) {
        const brcAtlas = getBrcAtlasGlobal$1();

        if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
          throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
        }

        if (!element.id) {
          mapIdCounter$1 += 1;
          element.id = `tanvis-map-${mapIdCounter$1}`;
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

  function getBrcAtlasGlobal$1() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brcatlas || null;
  }

  const atlasAdapter = createBrcAtlasAdapter();

  function renderStaticMap(element, config) {
    atlasAdapter.render(element, config);
  }

  // Wrapper to adapt BRC Atlas Leaflet maps for use in Tanvis.
  // This allows users to specify Leaflet/slippy maps as a visualization 
  // type in their HTML, and have them rendered using the BRC Atlas library.

  let mapIdCounter = 0;

  function createLeafletMapAdapter() {
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

  const leafletMapAdapter = createLeafletMapAdapter();

  function renderLeafletMap(element, config) {
    leafletMapAdapter.render(element, config);
  }

  // Makes initialization idempotent so calling init() repeatedly 
  // does not keep re-registering the same renderers.


  let defaultsRegistered = false;

  function registerDefaults() {
    if (defaultsRegistered) {
      return;
    }

    registerRenderer('table', renderTable);
    registerRenderer('chart', renderChart);
    registerRenderer('static-map', renderStaticMap);
    registerRenderer('slippy-map', renderLeafletMap);
    defaultsRegistered = true;
  }

  function init() {
    registerDefaults();

    const elements = scan(document, '.tanvis');

    return elements.map((element) => render(element));
  }

  const version = '0.1.0';

  if (typeof window !== 'undefined') {
    window.Tanvis = window.Tanvis || {};
    window.Tanvis.init = init;
    window.Tanvis.version = version;
  }

  exports.init = init;
  exports.version = version;

  return exports;

})({});
//# sourceMappingURL=tanvis.iife.js.map
