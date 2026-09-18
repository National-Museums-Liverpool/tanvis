import { clearElement } from '../utils/dom.js';
import { createControlsPanel } from '../controls/panel.js';
import { createRegionControls, normalizeRegionContractValue } from '../controls/regionControls.js';
import { createTaxonGroupControls } from '../controls/taxonGroupControls.js';
import { createSpeciesSearchControls } from '../controls/speciesSearchControls.js';
import { publishControlEvent } from '../controls/controlBus.js';
import { resolveApiBase } from '../config/apiBase.js';

const CONTROL_ELEMENT_TOKENS = new Set(['region', 'groups', 'language', 'species']);

export function createControlBlockAdapter() {
  return {
    name: 'control-block',
    render(element, config) {

      const loadToken = (element.__tanvisControlBlockLoadToken || 0) + 1;
      element.__tanvisControlBlockLoadToken = loadToken;

      clearElement(element);

      const visibleControls = parseVisibleControls(config.controlElements ?? element?.dataset?.visControlElements);

      const { panel, body } = createControlsPanel({
        label: 'Data options',
        ariaLabel: 'Toggle data controls',
        expanded: config.showDataOptsExpanded === true,
        showToggle: config.showDataOptsToggle !== false
      });
      panel.dataset.tanvisControls = 'data-options';
      element.appendChild(panel);

      if (visibleControls.has('region')) {
        createRegionControls({
          element,
          selectedValue: config.region,
          body,
          onRegionChange: (value) => {
            publishControlEvent(element.id, {
              type: 'region-change',
              region: normalizeRegionContractValue(value)
            });
          }
        });
      }

      if (visibleControls.has('groups') || visibleControls.has('language')) {
       
        createTaxonGroupControls({
          rootElement: element,
          apiBase: resolveApiBase(),
          selectedValue: config.groupId || '',
          labelMode: config.language || 'scientific',
          body,
          loadToken,
          showSelector: visibleControls.has('groups'),
          showLabelMode: visibleControls.has('language')
        });
      }

      if (visibleControls.has('species')) {
        createSpeciesSearchControls({
          rootElement: element,
          apiBase: resolveApiBase(),
          body,
          loadToken
        });
      }

      if (visibleControls.has('region')) {
        publishControlEvent(element.id, {
          type: 'region-change',
          region: normalizeRegionContractValue(config.region)
        });
      }
    }
  };
}

function parseVisibleControls(value) {
  if (typeof value !== 'string') {
    return new Set(['region', 'groups', 'language', 'species']);
  }

  const controls = value.split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => CONTROL_ELEMENT_TOKENS.has(token));

  return new Set(controls.length > 0 ? controls : ['region', 'groups', 'language', 'species']);
}
