export function validateAttributes(config) {
  if (!config.type) {
    return ['Missing data-vis-type'];
  }

  if (config.type === 'new-species-table' && !config.startDate) {
    return ['Missing data-vis-start-date for new-species-table'];
  }

  return [];
}
