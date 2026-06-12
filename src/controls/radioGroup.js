export function createRadioGroup(options) {
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