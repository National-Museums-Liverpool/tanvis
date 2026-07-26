import { createRadioGroup } from '../../controls/radioGroup.js';

export function normalizeMapTypeMode(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'leaflet') {
    return 'leaflet';
  }

  if (normalized === 'switch') {
    return 'switch';
  }

  return 'static';
}

export function normalizeBaseMapType(value) {
  return String(value || '').trim().toLowerCase() === 'leaflet' ? 'leaflet' : 'static';
}

function getStoredBaseMapType(value) {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'leaflet') {
    return 'leaflet';
  }

  if (normalized === 'static') {
    return 'static';
  }

  return '';
}

export function resolveActiveMapType(mapElement, mapTypeMode, datasetKey) {
  if (mapTypeMode !== 'switch') {
    return mapTypeMode;
  }

  const savedMapType = getStoredBaseMapType(getDatasetValue(mapElement, datasetKey));
  const fallbackMapType = getStoredBaseMapType(getDatasetValue(mapElement?.parentElement, datasetKey));
  const effectiveMapType = savedMapType || fallbackMapType || 'static';

  setDatasetValue(mapElement, datasetKey, effectiveMapType);
  if (!savedMapType && fallbackMapType && mapElement?.parentElement) {
    setDatasetValue(mapElement.parentElement, datasetKey, fallbackMapType);
  }

  return effectiveMapType;
}

export function ensureMapControlsContainer(hostElement, className = 'tanvis-grid-stats-map-controls') {
  for (const child of hostElement.children) {
    if (child.classList?.contains(className)) {
      return child;
    }
  }

  const controls = document.createElement('div');
  controls.className = className;
  hostElement.appendChild(controls);
  return controls;
}

export function createMapTypeSwitchControl({
  mapElement,
  activeMapType,
  onChange,
  fallbackId = 'tanvis-map',
  controlClassName = 'tanvis-grid-stats-map-type-switch'
}) {
  const group = createRadioGroup({
    name: getMapTypeSwitchName(mapElement, fallbackId),
    selectedValue: activeMapType,
    items: [
      { value: 'static', label: 'Static' },
      { value: 'leaflet', label: 'Leaflet' }
    ],
    onChange: (value) => {
      const nextMapType = normalizeBaseMapType(value);
      if (nextMapType === activeMapType) {
        return;
      }

      onChange(nextMapType);
    }
  });

  group.classList.add(controlClassName);
  return group;
}

function getMapTypeSwitchName(mapElement, fallbackId) {
  const base = mapElement.id || fallbackId;
  return `${base}-map-type-switch`;
}

function getDatasetValue(element, datasetKey) {
  if (!element) {
    return '';
  }

  const attributeName = `data-${datasetKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  const attributeValue = element.getAttribute?.(attributeName);
  if (attributeValue !== null && attributeValue !== undefined && attributeValue !== '') {
    return attributeValue;
  }

  return element.dataset?.[datasetKey] || '';
}

function setDatasetValue(element, datasetKey, value) {
  if (!element) {
    return;
  }

  const attributeName = `data-${datasetKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  element.setAttribute?.(attributeName, value);
  if (element.dataset) {
    element.dataset[datasetKey] = value;
  }
}
