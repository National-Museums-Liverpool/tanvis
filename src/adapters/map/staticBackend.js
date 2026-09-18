import { clearElement } from '../../utils/dom.js';
import { normalizeErrorMessage } from '../../utils/apiError.js';
import { createVisStatusReporter, ensureStylesheetDependency } from '../../utils/visStatus.js';
import { ensureSharedStyles } from '../../styles/sharedStyles.js';
import {
  assignElementId,
  clearControlSubscription,
  clearExpandResizeHandlers,
  getRegionBounds,
  calculateHeightFromBounds,
  getBrcAtlasGlobal,
  getEffectiveRegion,
  parseOptionalPositiveNumber,
  resolveRegionSelectionKey,
  subscribeToRegionControl
} from './common.js';
import { transOptsSel } from '../transOptsSel.js';

export function renderStaticAtlasMap(element, config, options = {}) {
  clearExpandResizeHandlers(element);
  clearControlSubscription(element);

  const status = createVisStatusReporter(element);
  clearElement(element);
  status.showInfo('Loading...');

  try {
    const brcAtlas = getBrcAtlasGlobal();

    if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
      throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
    }

    const hasStylesheet = ensureStylesheetDependency(status, {
      libraryName: 'BRC Atlas',
      stylesheetHints: ['brcatlas.umd.css'],
      message: 'BRC Atlas stylesheet is missing. Include brcatlas.umd.css to ensure the static map is styled correctly.'
    });

    const idPrefix = options.idPrefix || 'tanvis-map';
    assignElementId(element, idPrefix);
    ensureMapTetradInfo(element);

    const effectiveRegion = getEffectiveRegion(config);
    const renderConfig = effectiveRegion === config.region
      ? config
      : {
          ...config,
          region: effectiveRegion
        };

    element.dataset.visRegion = renderConfig.region;

    //console.log('config', createStaticMapOptions(element, renderConfig, options));
    console.log('rendering static map for region:', renderConfig.region);
    const map = brcAtlas.svgMap(createStaticMapOptions(element, renderConfig, options));
    const instanceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    map.__tanvisMapInstanceId = instanceId;
    map.__tanvisMapRegion = renderConfig.region;
    map.__tanvisMapElementId = element.id;
    console.log('[species-map] created static map instance', {
      instanceId,
      region: renderConfig.region,
      elementId: element.id
    });
    // pause execution to allow the map to render before continuing (for testing purposes)

    //await new Promise(resolve => setTimeout(resolve, 1000));

    if (map && typeof map.redrawMap === 'function') {
      console.log('[species-map] redraw static map instance', {
        instanceId,
        region: renderConfig.region,
        elementId: element.id
      });
      map.redrawMap();
    }

    if (renderConfig.control && options.subscribeToRegionControl !== false) {
      element.__tanvisControlCleanup = subscribeToRegionControl(renderConfig.control, (region) => {
        if (region === element.dataset.visRegion) {
          return;
        }

        element.dataset.visRegion = region;
        renderStaticAtlasMap(element, {
          ...renderConfig,
          region
        }, options);
      });
    }

    if (hasStylesheet) {
      status.clear();
    }
    return map;
  } catch (error) {
    clearElement(element);
    status.showError(normalizeErrorMessage(error, options.errorMessage || 'Failed to render static map'));
    return null;
  }
}

function createStaticMapOptions(element, config, options) {
  const includeHectads = config.hectads !== false;
  const shouldExpand = config.expand === true;
  const width = parseOptionalPositiveNumber(config.width);
  const explicitHeight = parseOptionalPositiveNumber(config.height);
  const selectedBounds = getRegionBounds(config.region);
  const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);

  const regionSelectionKey = resolveRegionSelectionKey(config.region);

  // Resolve the base path for static map resources which will be the
  // scriptURL with this stripped off the end: /dist/tanvis.iife.js
  // This is required because on GitHub pages, the script is served from
  // a subfolder.
  let scriptUrl;
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].getAttribute('src');
    if (src && src.includes('tanvis.iife.js')) {
      scriptUrl = scripts[i].src;
      break;
    }
  }
  const basePath = scriptUrl ? scriptUrl.substring(0, scriptUrl.indexOf('/dist/tanvis.iife.js') + 1) : '';
 
  return {
    selector: `#${element.id}`,
    captionId: 'map-tetrad-info',
    transOptsControl: false,
    transOptsSel,
    transOptsKey: regionSelectionKey,
    boundaryGjson: `${basePath}data/vcs/simp-100/${regionSelectionKey}-100.geojson`,
    ...(height !== undefined ? { height } : {}),
    ...(shouldExpand ? { expand: true } : {}),
    ...(includeHectads
      ? { gridGjson: `${basePath}data/vcs/hectad-grids/${regionSelectionKey}-hectads.geojson` }
      : { gridLineStyle: 'none' }),
    mapTypesSel: options.mapTypesSel,
    mapTypesKey: options.mapTypesKey,
  };
}

function ensureMapTetradInfo(element) {
  if (typeof document === 'undefined') {
    return;
  }

  ensureSharedStyles();

  const parent = element?.parentElement;
  if (!parent) {
    return;
  }

  let info = document.getElementById('map-tetrad-info');
  if (!info) {
    info = document.createElement('div');
    info.id = 'map-tetrad-info';
  }

  info.setAttribute('data-placeholder', 'Tetrad information');
  ensureMapTetradInfoPlaceholderBehavior(info);
  parent.insertBefore(info, element);
}

function ensureMapTetradInfoPlaceholderBehavior(info) {
  if (!info) {
    return;
  }

  if (!info.__tanvisMapTetradInfoObserver) {
    const observer = new MutationObserver(() => {
      syncMapTetradInfoEmptyState(info);
    });

    observer.observe(info, {
      childList: true,
      subtree: true,
      characterData: true
    });

    info.__tanvisMapTetradInfoObserver = observer;
  }

  syncMapTetradInfoEmptyState(info);
}

function syncMapTetradInfoEmptyState(info) {
  const isEmpty = !String(info.textContent || '').trim();
  info.classList.toggle('tanvis-map-tetrad-info-empty', isEmpty);
}
