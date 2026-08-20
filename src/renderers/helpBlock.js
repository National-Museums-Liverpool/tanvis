import { createHelpBlockAdapter } from '../adapters/helpBlock.js';

const helpBlockAdapter = createHelpBlockAdapter();

export function renderHelpBlock(element, config) {
  helpBlockAdapter.render(element, config);
}
