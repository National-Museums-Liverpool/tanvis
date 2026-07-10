import { clearElement } from '../utils/dom.js';
import { createControlsPanel } from '../controls/panel.js';
import { createAreaControls } from '../controls/areaControls.js';
import { createTaxonGroupControls } from '../controls/taxonGroupControls.js';
import { publishControlEvent } from '../controls/controlBus.js';

const DEFAULT_API_BASE = '/api/v1';

export function createControlBlockAdapter() {
  return {
    name: 'control-block',
    render(element, config) {
      const loadToken = (element.__tanvisControlBlockLoadToken || 0) + 1;
      element.__tanvisControlBlockLoadToken = loadToken;

      clearElement(element);

      const { panel, body } = createControlsPanel({
        label: 'Data options',
        ariaLabel: 'Toggle data controls'
      });
      panel.dataset.tanvisControls = 'data-options';
      element.appendChild(panel);

      element.appendChild(createAreaControls({
        element,
        selectedValue: config.area,
        body,
        onAreaChange: (value) => {
          publishControlEvent(element.id, {
            type: 'area-change',
            area: value
          });
        }
      }));

      element.appendChild(createTaxonGroupControls({
        rootElement: element,
        apiBase: config.source || DEFAULT_API_BASE,
        body,
        loadToken
      }));

      publishControlEvent(element.id, {
        type: 'area-change',
        area: config.area
      });
    }
  };
}