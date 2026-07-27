import { parseOptions } from '../config/parseOptions.js';
import { validateAttributes } from '../config/validateAttributes.js';
import { getRenderer } from './registry.js';
import { markRendered } from './lifecycle.js';
import { warn } from '../utils/logger.js';
import { createVisStatusReporter } from '../utils/visStatus.js';

export function render(element) {
  const config = parseOptions(element);
  const errors = validateAttributes(config, element);
  const status = createVisStatusReporter(element);

  if (errors.length > 0) {
    status.showError(errors[0]);
    warn(errors[0]);
    return { rendered: false, errors };
  }

  const renderer = getRenderer(config.type);

  if (!renderer) {
    const message = `No renderer registered for type "${config.type}"`;
    status.showError(message);
    warn(message);
    return { rendered: false, errors: [message] };
  }

  renderer(element, config);
  markRendered(element);

  return { rendered: true, errors: [] };
}
