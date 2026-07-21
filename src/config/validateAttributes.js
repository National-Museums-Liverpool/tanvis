export function validateAttributes(config, element) {
  if (!config.type) {
    return ['Missing data-vis-type'];
  }

  if (config.type === 'control-block' && !element?.id) {
    return ['Missing id attribute for control-block'];
  }

  if (config.type === 'new-species-table' && !config.startDate) {
    return ['Missing data-vis-start-date for new-species-table'];
  }

  // if (config.type === 'temporal-year-chart' && !config.taxonId) {
  //   return ['Missing data-vis-taxonid for temporal-year-chart'];
  // }

  return [];
}
