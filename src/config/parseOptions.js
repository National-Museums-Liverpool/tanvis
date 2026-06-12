export function parseOptions(element) {
  const dataset = element?.dataset || {};

  return {
    type: dataset.visType || 'table',
    source: dataset.visSource,
    area: dataset.visArea || 'vc-58-59-60',
    ctl: parseBoolean(dataset.visCtl),
    hectads: parseBooleanDefaultTrue(dataset.visHectads),
    options: parseJson(dataset.visOptions)
  };
}

function parseBoolean(value) {
  return String(value).toLowerCase() === 'true';
}

function parseBooleanDefaultTrue(value) {
  if (value === undefined || value === null || value === '') {
    return true;
  }

  return String(value).toLowerCase() === 'true';
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
