import { getVisAttributeSchema } from './visAttributeSchema.js';

export function validateAttributes(config, element) {
  const schema = getVisAttributeSchema(config?.type);

  for (const rule of schema.rules) {
    if (rule.kind === 'conditional' && !rule.when?.(config, element?.dataset || {})) {
      continue;
    }

    const value = config?.[rule.key];

    if (rule.kind === 'required' && (value === undefined || value === null || value === '')) {
      return [rule.message || `Missing data attribute ${rule.datasetName}`];
    }

    if (rule.validate && !rule.validate(value, config, element)) {
      return [rule.invalidMessage || rule.message || `Invalid data attribute ${rule.datasetName}`];
    }
  }

  if (config?.type === 'control-block' && !element?.id) {
    return ['Missing id attribute for control-block'];
  }

  return [];
}
