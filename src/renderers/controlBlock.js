import { createControlBlockAdapter } from '../adapters/controlBlock.js';

const controlBlockAdapter = createControlBlockAdapter();

export function renderControlBlock(element, config) {
  controlBlockAdapter.render(element, config);
}