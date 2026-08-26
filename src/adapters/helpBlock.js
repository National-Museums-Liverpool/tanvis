import { clearElement } from '../utils/dom.js';
import { ensureSharedStyles } from '../styles/sharedStyles.js';
import { createControlsPanel } from '../controls/panel.js';
import { getKnownVisTypes, getVisAttributeSchema, getDataAttributeName, getVisTypeDescription } from '../config/visAttributeSchema.js';

// Adapter for the help-block visualisation, which documents the data
// attributes supported by every known Tanvis visualisation type.

export function createHelpBlockAdapter() {
  return {
    name: 'help-block',
    render(element, config) {
      ensureSharedStyles();
      clearElement(element);

      getKnownVisTypes().forEach((visType) => {
        element.appendChild(createVisTypeSection(visType));
      });
    }
  };
}

function createVisTypeSection(visType) {
  const { panel, body } = createControlsPanel({
    symbol: 'ℹ',
    label: visType,
    ariaLabel: `Toggle help for ${visType}`,
    expanded: false
  });

  panel.classList.add('tanvis-help-block-section');

  const { rules } = getVisAttributeSchema(visType);

  console.log(`Creating help block for ${visType} with rules:`, rules);

  let exampleHtml = `<div class="tanvis" data-vis-type="${visType}"`;
  rules
    .filter((rule) => rule.key !== 'type')
    .forEach((rule) => {
        exampleHtml = `${exampleHtml} ${getDataAttributeName(rule)}="${rule.defaultValue || rule.exampleValue || ''}"`;
      });
  exampleHtml = `${exampleHtml}></div>`;

  const exampleButton = document.createElement('button');
  exampleButton.type = 'button';
  exampleButton.className = 'tanvis-help-block-example-button';
  exampleButton.textContent = 'Example';
    exampleButton.addEventListener('click', () => {
        // Raise a custom even with the example HTML as the detail
        console.log('Dispatching tanvis-example event');
        const event = new CustomEvent('tanvis-example', { detail: exampleHtml });
        document.dispatchEvent(event);
    });
  body.appendChild(exampleButton);


  const description = getVisTypeDescription(visType);
  if (description) {
    const descriptionElement = document.createElement('div');
    descriptionElement.className = 'tanvis-help-block-description';
    descriptionElement.textContent = description;
    body.appendChild(descriptionElement);
  }

  rules
    .filter((rule) => rule.key !== 'type')
    .forEach((rule) => {
      body.appendChild(createRuleEntry(rule));
    });

  return panel;
}

function createRuleEntry(rule) {
  const entry = document.createElement('div');
  entry.className = 'tanvis-help-block-attribute';

  const name = document.createElement('div');
  name.className = 'tanvis-help-block-attribute-name';
  name.textContent = getDataAttributeName(rule);
  entry.appendChild(name);

  const info = document.createElement('div');
  info.className = 'tanvis-help-block-attribute-info';
  info.textContent = rule.info;
  entry.appendChild(info);

  if (rule.allowedValues) {
    const allowedValues = document.createElement('div');
    allowedValues.className = 'tanvis-help-block-attribute-allowed-values';
    allowedValues.textContent = `Allowed values: ${rule.allowedValues.join(', ')}`;
    entry.appendChild(allowedValues);
  }

  if (rule.defaultValue !== undefined && rule.defaultValue !== '') {
    const defaultValue = document.createElement('div');
    defaultValue.className = 'tanvis-help-block-attribute-default-value';
    defaultValue.textContent = `Default value: ${rule.defaultValue}`;
    entry.appendChild(defaultValue);
  }

  return entry;
}
