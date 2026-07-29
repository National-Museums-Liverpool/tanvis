import { getVisAttributeSchema } from './visAttributeSchema.js';

export function validateAttributes(config, element) {
  const schema = getVisAttributeSchema(config?.type);

  for (const rule of schema.rules) {
    const value = config?.[rule.key];
    const result = rule.parseAndValidate?.(datasetValueForRule(rule, config, element), config, config, element, rule);

    if (result?.error) {
      return [result.message];
    }

    if (rule.kind === 'required' && (value === undefined || value === null || value === '')) {
      return [`Missing required data attribute ${rule.datasetName}`];
    }
  }

  if (config?.type === 'control-block' && !element?.id) {
    return ['Missing id attribute for control-block'];
  }

  return [];
}

function datasetValueForRule(rule, config, element) {
  return element?.dataset?.[rule.datasetName];
}
