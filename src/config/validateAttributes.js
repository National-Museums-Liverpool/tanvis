export function validateAttributes(config) {
  if (!config.type) {
    return ['Missing data-vis-type'];
  }

  return [];
}
