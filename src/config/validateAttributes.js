export function validateAttributes(config, element) {
  if (!config.type) {
    return ['Missing data-vis-type'];
  }

  if ((config.type === 'control-block' || config.type === 'control-bock') && !element?.id) {
    return ['Missing id attribute for control-block'];
  }

  if (config.type === 'new-species-table' && !config.startDate) {
    return ['Missing data-vis-start-date for new-species-table'];
  }

  return [];
}
