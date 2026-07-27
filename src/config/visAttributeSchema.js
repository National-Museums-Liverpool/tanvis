const KNOWN_VIS_TYPES = [
  'control-block',
  'species-map',
  'new-species-table',
  'increasing-species-table',
  'species-absent-since',
  'grid-stats-map',
  'temporal-year-chart'
];

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

function parseOptionalPositiveInteger(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed);
}

function parseOptionalString(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
}

function parseOptionalDate(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return String(value);
}

function parseRequiredString(value) {
  const parsed = parseOptionalString(value);
  return parsed && parsed.trim() ? parsed : undefined;
}

const COMMON_RULES = [
  {
    key: 'type',
    datasetName: 'visType',
    kind: 'required',
    parser: parseRequiredString,
    validate: (value) => KNOWN_VIS_TYPES.includes(value),
    message: 'Missing data-vis-type',
    invalidMessage: 'Invalid data-vis-type',
    includeUndefined: true
  },
  {
    key: 'source',
    datasetName: 'visSource',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'control',
    datasetName: 'visControl',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'linkedTable',
    datasetName: 'visLinkedTable',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'species',
    datasetName: 'visSpecies',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'taxonId',
    datasetName: 'visTaxonid',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'startDate',
    datasetName: 'visStartDate',
    kind: 'optional',
    parser: parseOptionalDate,
    includeUndefined: true
  },
  {
    key: 'endDate',
    datasetName: 'visEndDate',
    kind: 'optional',
    parser: parseOptionalDate,
    includeUndefined: true
  },
  {
    key: 'area',
    datasetName: 'visArea',
    kind: 'optional',
    parser: (value) => parseOptionalString(value) || 'vc-all',
    includeUndefined: true
  },
  {
    key: 'ctl',
    datasetName: 'visCtl',
    kind: 'optional',
    parser: (value) => {
      if (value === undefined || value === null || value === '') {
        return false;
      }

      return String(value).toLowerCase() === 'true';
    },
    includeUndefined: true
  },
  {
    key: 'boundaries',
    datasetName: 'visBoundaries',
    kind: 'optional',
    parser: (value) => {
      if (value === undefined || value === null || value === '') {
        return false;
      }

      return String(value).toLowerCase() === 'true';
    },
    includeUndefined: true
  },
  {
    key: 'gridStatsType',
    datasetName: 'visGridStatsType',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'hectads',
    datasetName: 'visHectads',
    kind: 'optional',
    parser: (value) => {
      if (value === undefined || value === null || value === '') {
        return true;
      }

      return String(value).toLowerCase() === 'true';
    },
    includeUndefined: true
  },
  {
    key: 'mapType',
    datasetName: 'visMapType',
    kind: 'optional',
    parser: parseOptionalString,
    includeUndefined: true
  },
  {
    key: 'expand',
    datasetName: 'visExpand',
    kind: 'optional',
    parser: parseOptionalBoolean
  },
  {
    key: 'width',
    datasetName: 'visWidth',
    kind: 'optional',
    parser: parseOptionalPositiveNumber
  },
  {
    key: 'height',
    datasetName: 'visHeight',
    kind: 'optional',
    parser: parseOptionalPositiveNumber
  },
  {
    key: 'topN',
    datasetName: 'visTopN',
    kind: 'optional',
    parser: parseOptionalPositiveInteger
  },
  {
    key: 'year',
    datasetName: 'visYear',
    kind: 'optional',
    parser: parseOptionalPositiveInteger
  },
  {
    key: 'startYear',
    datasetName: 'visStartYear',
    kind: 'optional',
    parser: parseOptionalPositiveInteger
  },
  {
    key: 'endYear',
    datasetName: 'visEndYear',
    kind: 'optional',
    parser: parseOptionalPositiveInteger
  }
];

const VIS_TYPE_RULES = {
  'control-block': [],
  'species-map': [
    {
      key: 'area',
      datasetName: 'visArea',
      kind: 'optional',
      parser: (value) => parseOptionalString(value) || 'vc-all'
    },
    {
      key: 'control',
      datasetName: 'visControl',
      kind: 'optional',
      parser: parseOptionalString
    },
    {
      key: 'species',
      datasetName: 'visSpecies',
      kind: 'optional',
      parser: parseOptionalString
    },
    {
      key: 'mapType',
      datasetName: 'visMapType',
      kind: 'optional',
      parser: parseOptionalString
    }
  ],
  'new-species-table': [
    {
      key: 'startDate',
      datasetName: 'visStartDate',
      kind: 'required',
      parser: parseOptionalDate,
      validate: (value) => Boolean(value),
      message: 'Missing data-vis-start-date for new-species-table'
    }
  ],
  'increasing-species-table': [],
  'species-absent-since': [
    {
      key: 'year',
      datasetName: 'visYear',
      kind: 'required',
      parser: parseOptionalPositiveInteger,
      validate: (value) => Number.isFinite(value),
      message: 'Missing data-vis-year for species-absent-since'
    }
  ],
  'grid-stats-map': [],
  'temporal-year-chart': [
    {
      key: 'startYear',
      datasetName: 'visStartYear',
      kind: 'optional',
      parser: parseOptionalPositiveInteger
    },
    {
      key: 'endYear',
      datasetName: 'visEndYear',
      kind: 'optional',
      parser: parseOptionalPositiveInteger
    },
    {
      key: 'ctl',
      datasetName: 'visCtl',
      kind: 'optional',
      parser: parseBoolean
    },
    {
      key: 'boundaries',
      datasetName: 'visBoundaries',
      kind: 'optional',
      parser: parseBoolean
    },
    {
      key: 'expand',
      datasetName: 'visExpand',
      kind: 'optional',
      parser: parseOptionalBoolean
    },
    {
      key: 'width',
      datasetName: 'visWidth',
      kind: 'optional',
      parser: parseOptionalPositiveNumber
    },
    {
      key: 'height',
      datasetName: 'visHeight',
      kind: 'optional',
      parser: parseOptionalPositiveNumber
    }
  ]
};

export function getVisAttributeSchema(visType) {
  return {
    visType,
    rules: [
      ...COMMON_RULES,
      ...(VIS_TYPE_RULES[visType] || [])
    ]
  };
}

export function getKnownVisTypes() {
  return [...KNOWN_VIS_TYPES];
}
