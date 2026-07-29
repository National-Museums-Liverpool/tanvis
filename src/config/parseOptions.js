import { getVisAttributeSchema } from './visAttributeSchema.js';

export function parseOptions(element) {
  const dataset = element?.dataset || {};
  const schema = getVisAttributeSchema(dataset.visType);
  const config = {};

  for (const rule of schema.rules) {
    const rawValue = dataset[rule.datasetName];
    const result = rule.parseAndValidate?.(rawValue, dataset, config, element, rule);
    const resolvedValue = result?.value ?? rule.defaultValue;

    config[rule.key] = resolvedValue;
  }

  return config;
}
