import { createGeneralInfoBlockAdapter } from '../adapters/generalInfoBlock.js';

const generalInfoBlockAdapter = createGeneralInfoBlockAdapter();

export function renderGeneralInfoBlock(element, config) {
  generalInfoBlockAdapter.render(element, config);
}
