import { getVisAttributeSchema } from './visAttributeSchema.js';

export function parseOptions(element) {
  const dataset = element?.dataset || {};
  const schema = getVisAttributeSchema(dataset.visType);
  const config = {};

  for (const rule of schema.rules) {
    if (rule.kind === 'conditional' && !rule.when?.(config, dataset)) {
      continue;
    }

    const rawValue = dataset[rule.datasetName];
    const parsedValue = rule.parser?.(rawValue, dataset, config);

    if (parsedValue === undefined) {
      if (rule.defaultValue !== undefined) {
        config[rule.key] = rule.defaultValue;
      } else if (rule.includeUndefined) {
        config[rule.key] = undefined;
      }
      continue;
    }

    config[rule.key] = parsedValue;
  }

  return config;
}
