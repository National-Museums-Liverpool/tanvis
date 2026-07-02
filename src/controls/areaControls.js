import { createControlsPanel } from './panel.js';
import { createRadioGroup } from './radioGroup.js';

export const areaOptions = [
  { label: 'vc58', value: 'vc-58' },
  { label: 'vc59', value: 'vc-59' },
  { label: 'vc60', value: 'vc-60' },
  { label: 'all', value: 'vc-58-59-60' }
];

export function createAreaControls({ element, selectedValue, onAreaChange }) {
  const { panel, body } = createControlsPanel({
    label: 'Data options',
    ariaLabel: 'Toggle map controls'
  });
  panel.dataset.tanvisControls = 'area';

  const groupName = `${element.id}-area`;
  const group = createRadioGroup({
    name: groupName,
    selectedValue,
    items: areaOptions,
    onChange: (value) => {
      element.dataset.visArea = value;
      if (typeof onAreaChange === 'function') {
        onAreaChange(value);
      }
    }
  });

  body.appendChild(group);

  return panel;
}
