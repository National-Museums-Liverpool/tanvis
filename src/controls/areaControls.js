import { createControlsPanel } from './panel.js';
import { createRadioGroup } from './radioGroup.js';

export function normalizeAreaContractValue(value) {
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

function normalizeAreaSelectionValue(value) {
  const normalized = normalizeAreaContractValue(value);
  if (normalized === '') {
    return '';
  }

  return String(normalized);
}

export const areaOptions = [
  { label: 'vc58', value: '58' },
  { label: 'vc59', value: '59' },
  { label: 'vc60', value: '60' },
  { label: 'all', value: '' }
];

export function createAreaControls({ element, selectedValue, onAreaChange, body }) {
  const targetBody = body || createControlsPanel({
    label: 'Data options',
    ariaLabel: 'Toggle map controls'
  }).body;

  if (body) {
    body.dataset.tanvisControls = 'area';
  }

  const groupName = element?.id ? `${element.id}-area` : 'tanvis-control-block-area';
  const group = createRadioGroup({
    name: groupName,
    selectedValue: normalizeAreaSelectionValue(selectedValue),
    items: areaOptions,
    onChange: (value) => {
      const normalizedArea = normalizeAreaContractValue(value);

      if (element?.dataset) {
        element.dataset.visArea = normalizedArea === '' ? '' : String(normalizedArea);
      }

      if (typeof onAreaChange === 'function') {
        onAreaChange(normalizedArea);
      }
    }
  });

  targetBody.appendChild(group);

  return targetBody;
}
