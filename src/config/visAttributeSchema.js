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
  if (value === undefined || value === null || value === '') {
    return undefined;
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

function createRule({
  key,
  datasetName,
  kind = 'optional',
  parser,
  validate,
  message,
  invalidMessage,
  defaultValue,
  includeUndefined = false
}) {
  return {
    key,
    datasetName,
    kind,
    parser,
    validate,
    message,
    invalidMessage,
    defaultValue,
    includeUndefined
  };
}

const COMMON_RULES = {
  type: createRule({
    key: 'type',
    datasetName: 'visType',
    kind: 'required',
    parser: parseRequiredString,
    validate: (value) => KNOWN_VIS_TYPES.includes(value),
    message: 'Missing data-vis-type',
    invalidMessage: 'Invalid data-vis-type',
    defaultValue: undefined,
    includeUndefined: true
  }),
  source: createRule({
    key: 'source',
    datasetName: 'visSource',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  control: createRule({
    key: 'control',
    datasetName: 'visControl',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  linkedTable: createRule({
    key: 'linkedTable',
    datasetName: 'visLinkedTable',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  species: createRule({
    key: 'species',
    datasetName: 'visSpecies',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  taxonId: createRule({
    key: 'taxonId',
    datasetName: 'visTaxonid',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  endDate: createRule({
    key: 'endDate',
    datasetName: 'visEndDate',
    parser: parseOptionalDate,
    defaultValue: undefined,
    includeUndefined: true
  }),
  area: createRule({
    key: 'area',
    datasetName: 'visArea',
    parser: (value) => parseOptionalString(value) || 'vc-all',
    defaultValue: 'vc-all',
    includeUndefined: true
  }),
  ctl: createRule({
    key: 'ctl',
    datasetName: 'visCtl',
    parser: parseBoolean,
    defaultValue: false,
    includeUndefined: true
  }),
  boundaries: createRule({
    key: 'boundaries',
    datasetName: 'visBoundaries',
    parser: parseBoolean,
    defaultValue: false,
    includeUndefined: true
  }),
  gridStatsType: createRule({
    key: 'gridStatsType',
    datasetName: 'visGridStatsType',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  hectads: createRule({
    key: 'hectads',
    datasetName: 'visHectads',
    parser: parseBoolean,
    defaultValue: true,
    includeUndefined: true
  }),
  mapType: createRule({
    key: 'mapType',
    datasetName: 'visMapType',
    parser: parseOptionalString,
    defaultValue: undefined,
    includeUndefined: true
  }),
  expand: createRule({
    key: 'expand',
    datasetName: 'visExpand',
    parser: parseOptionalBoolean,
    defaultValue: undefined,
    includeUndefined: false
  }),
  width: createRule({
    key: 'width',
    datasetName: 'visWidth',
    parser: parseOptionalPositiveNumber,
    defaultValue: undefined,
    includeUndefined: false
  }),
  height: createRule({
    key: 'height',
    datasetName: 'visHeight',
    parser: parseOptionalPositiveNumber,
    defaultValue: undefined,
    includeUndefined: false
  }),
  topN: createRule({
    key: 'topN',
    datasetName: 'visTopN',
    parser: parseOptionalPositiveInteger,
    defaultValue: undefined,
    includeUndefined: false
  }),
  year: createRule({
    key: 'year',
    datasetName: 'visYear',
    parser: parseOptionalPositiveInteger,
    defaultValue: undefined,
    includeUndefined: false
  }),
  startYear: createRule({
    key: 'startYear',
    datasetName: 'visStartYear',
    parser: parseOptionalPositiveInteger,
    defaultValue: undefined,
    includeUndefined: false
  }),
  endYear: createRule({
    key: 'endYear',
    datasetName: 'visEndYear',
    parser: parseOptionalPositiveInteger,
    defaultValue: undefined,
    includeUndefined: false
  })
};

const VIS_TYPE_RULES = {
  'control-block': ['type', 'source', 'area', 'ctl', 'boundaries', 'gridStatsType', 'hectads', 'expand', 'width', 'height'],
  'species-map': ['type', 'source', 'control', 'species', 'area', 'hectads', 'mapType', 'expand', 'width', 'height'],
  'new-species-table': [
    'type',
    'source',
    {
      key: 'startDate',
      datasetName: 'visStartDate',
      kind: 'required',
      parser: parseOptionalDate,
      validate: (value) => Boolean(value),
      message: 'Missing data-vis-start-date for new-species-table',
      defaultValue: undefined,
      includeUndefined: true
    },
    'endDate',
    'expand',
    'width',
    'height'
  ],
  'increasing-species-table': ['type', 'source', 'topN', 'expand', 'width', 'height'],
  'species-absent-since': [
    'type',
    'source',
    {
      key: 'year',
      datasetName: 'visYear',
      kind: 'required',
      parser: parseOptionalPositiveInteger,
      validate: (value) => Number.isFinite(value),
      message: 'Missing data-vis-year for species-absent-since',
      defaultValue: undefined,
      includeUndefined: true
    },
    'expand',
    'width',
    'height'
  ],
  'grid-stats-map': ['type', 'source', 'area', 'control', 'gridStatsType', 'hectads', 'mapType', 'expand', 'width', 'height'],
  'temporal-year-chart': ['type', 'source', 'taxonId', 'linkedTable', 'startYear', 'endYear', 'ctl', 'boundaries', 'expand', 'width', 'height']
};

export function getVisAttributeSchema(visType) {
  const configuredRuleNames = VIS_TYPE_RULES[visType] || Object.keys(COMMON_RULES);
  const configuredRules = configuredRuleNames
    .map((ruleName) => typeof ruleName === 'string' ? COMMON_RULES[ruleName] : ruleName)
    .filter(Boolean);

  return {
    visType,
    rules: configuredRules
  };
}

export function getKnownVisTypes() {
  return [...KNOWN_VIS_TYPES];
}
