import { getLatestControlEvent, subscribeToControl } from '../../controls/controlBus.js';
import { transOptsSel } from '../transOptsSel.js';

const elementIdCounters = new Map();

export function assignElementId(element, prefix) {
  if (element?.id) {
    return element.id;
  }

  const current = elementIdCounters.get(prefix) || 0;
  const next = current + 1;
  elementIdCounters.set(prefix, next);
  element.id = `${prefix}-${next}`;
  return element.id;
}

export function clearControlSubscription(element) {
  const cleanup = element?.__tanvisControlCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisControlCleanup;
}

export function clearExpandResizeHandlers(element) {
  const cleanup = element?.__tanvisExpandCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }

  delete element.__tanvisExpandCleanup;
}

export function getEffectiveArea(config) {
  if (!config.control) {
    return config.area;
  }

  const latestEvent = getLatestControlEvent(config.control);
  if (latestEvent?.type === 'area-change' && latestEvent.area) {
    return latestEvent.area;
  }

  if (typeof document === 'undefined') {
    return config.area;
  }

  const controlElement = document.getElementById(config.control);
  const controlArea = controlElement?.dataset?.visArea;
  return controlArea || config.area;
}

export function subscribeToAreaControl(controlId, handler) {
  return subscribeToControl(controlId, (event) => {
    if (!event || event.type !== 'area-change' || !event.area) {
      return;
    }

    handler(event.area, event);
  });
}

export function parseOptionalPositiveNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export function calculateHeightFromBounds(width, bounds) {
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

export function getConfiguredWidth(element, config) {
  const configuredWidth = parseOptionalPositiveNumber(config.width);

  if (config.expand !== true) {
    return configuredWidth;
  }

  return getParentWidth(element) ?? configuredWidth;
}

export function getParentWidth(element) {
  return parseOptionalPositiveNumber(element?.parentElement?.clientWidth);
}

export function attachExpandResizeHandlers(element, config, map, onResize) {
  const resizeAction = typeof onResize === 'function'
    ? onResize
    : () => {
        resizeExpandedMap(element, config, map);
      };

  let resizeObserver;
  if (typeof ResizeObserver !== 'undefined' && element.parentElement) {
    resizeObserver = new ResizeObserver(resizeAction);
    resizeObserver.observe(element.parentElement);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', resizeAction);
  }

  element.__tanvisExpandCleanup = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', resizeAction);
    }
  };
}

export function resizeExpandedMap(element, config, map) {
  if (!map || typeof map.setSize !== 'function') {
    return;
  }

  const width = getParentWidth(element);
  const explicitHeight = parseOptionalPositiveNumber(config.height);
  const bounds = getAreaBounds(config.area);
  const height = explicitHeight ?? calculateHeightFromBounds(width, bounds);

  if (width === undefined || height === undefined) {
    return;
  }

  map.setSize(width, height);

  if (typeof map.invalidateSize === 'function') {
    map.invalidateSize();
  }
}

export function getAreaBounds(area) {
  return transOptsSel[area]?.bounds;
}

export function getAreaCentroid(area) {
  return transOptsSel[area]?.centroid;
}

export function getAreaInitZoom(area) {
  return transOptsSel[area]?.initZoom ?? 10;
}

export function getBrcAtlasGlobal() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.brcatlas || null;
}