import { createControlsPanel } from './panel.js';
import { createRadioGroup } from './radioGroup.js';

export function normalizeRegionContractValue(value) {
  if (value === '' || value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'vc-all' || trimmed === 'all') {
      return '';
    }

    if (/^vc-\d+$/.test(trimmed)) {
      return Number.parseInt(trimmed.substring(3), 10);
    }

    if (/^\d+$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10);
    }
  }

  return value;
}

function normalizeRegionSelectionValue(value) {
  const normalized = normalizeRegionContractValue(value);
  if (normalized === '') {
    return '';
  }

  return String(normalized);
}

export const regionOptions = [
  { label: 'vc58', value: '58' },
  { label: 'vc59', value: '59' },
  { label: 'vc60', value: '60' },
  { label: 'all', value: '' }
];

export function createRegionControls({ element, selectedValue, onRegionChange, body }) {
  const targetBody = body || createControlsPanel({
    label: 'Data options',
    ariaLabel: 'Toggle map controls'
  }).body;

  if (body) {
    body.dataset.tanvisControls = 'region';
  }

  const groupName = element?.id ? `${element.id}-region` : 'tanvis-control-block-region';
  const group = createRadioGroup({
    name: groupName,
    selectedValue: normalizeRegionSelectionValue(selectedValue),
    items: regionOptions,
    onChange: (value) => {
      const normalizedRegion = normalizeRegionContractValue(value);

      if (element?.dataset) {
        element.dataset.visRegion = normalizedRegion === '' ? '' : String(normalizedRegion);
      }

      if (typeof onRegionChange === 'function') {
        onRegionChange(normalizedRegion);
      }
    }
  });

  targetBody.appendChild(group);

  return targetBody;
}
