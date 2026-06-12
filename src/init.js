import { scan } from './scan.js';
import { render } from './core/render.js';
import { registerDefaults } from './core/registerDefaults.js';

export function init() {
  registerDefaults();

  const elements = scan(document, '.tanvis');

  return elements.map((element) => render(element));
}
