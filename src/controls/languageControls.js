import { createRadioGroup } from './radioGroup.js';

const LABEL_MODE_OPTIONS = [
  { label: 'Scientific', value: 'scientific' },
  { label: 'Vernacular', value: 'vernacular' }
];

export function createLanguageControls({ rootElement, body, state, onChange }) {
  if (!body) {
    return null;
  }

  const labelModeField = document.createElement('div');
  labelModeField.className = 'tanvis-controls-field tanvis-controls-gap-top';
  body.appendChild(labelModeField);

  const radioGroup = createRadioGroup({
    name: `${rootElement?.id || 'tanvis'}-taxon-group-label-mode`,
    selectedValue: state.labelMode,
    items: LABEL_MODE_OPTIONS,
    onChange: (value) => {
      state.labelMode = value;
      if (typeof onChange === 'function') {
        onChange(value);
      }
    }
  });

  labelModeField.appendChild(radioGroup);
  return labelModeField;
}
