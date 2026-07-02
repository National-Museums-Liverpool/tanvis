export function parseOptions(element) {
  const dataset = element?.dataset || {};
  const expand = parseOptionalBoolean(dataset.visExpand);
  const width = parseOptionalPositiveNumber(dataset.visWidth);
  const height = parseOptionalPositiveNumber(dataset.visHeight);

  return {
    type: dataset.visType || 'table',
    source: dataset.visSource,
    area: dataset.visArea || 'vc-58-59-60',
    ctl: parseBoolean(dataset.visCtl),
    boundaries: parseBoolean(dataset.visBoundaries),
    hectads: parseBooleanDefaultTrue(dataset.visHectads),
    ...(expand !== undefined ? { expand } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {})
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

function parseOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value).toLowerCase() === 'true';
}

function parseOptionalPositiveNumber(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}
