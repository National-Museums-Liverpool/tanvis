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

export function resolveActiveMapType(mapElement, mapTypeMode, datasetKey) {
  if (mapTypeMode !== 'switch') {
    return mapTypeMode;
  }

  const savedMapType = normalizeBaseMapType(mapElement?.dataset?.[datasetKey]);
  mapElement.dataset[datasetKey] = savedMapType;
  return savedMapType;
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
