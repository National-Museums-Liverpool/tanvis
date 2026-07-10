import { parseOptions } from '../config/parseOptions.js';
import { validateAttributes } from '../config/validateAttributes.js';
import { getRenderer } from './registry.js';
import { markRendered } from './lifecycle.js';
import { warn } from '../utils/logger.js';

export function render(element) {
  const config = parseOptions(element);
  const errors = validateAttributes(config, element);

  if (errors.length > 0) {
    warn(errors[0]);
    return { rendered: false, errors };
  }

  const renderer = getRenderer(config.type);

  if (!renderer) {
    warn(`No renderer registered for type "${config.type}"`);
    return { rendered: false, errors: [`No renderer registered for type "${config.type}"`] };
  }

  renderer(element, config);
  markRendered(element);

  return { rendered: true, errors: [] };
}
