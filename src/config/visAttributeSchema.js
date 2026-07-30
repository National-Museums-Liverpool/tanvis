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
  parseAndValidate,
  defaultValue
}) {
  return {
    key,
    datasetName,
    kind,
    parseAndValidate,
    defaultValue
  };
}

function createPv({
  parser,
  validate = undefined,
  messageBuilder = undefined
}) {
  return (value, dataset, config, element, rule) => {
    const parsedValue = parser?.(value, dataset, config, element, rule);
    const resolvedValue = parsedValue === undefined ? undefined : parsedValue;

    if (parsedValue === undefined) {
      if (rule.kind === 'required') {
        return {
          value: rule.defaultValue,
          error: true,
          message: messageBuilder?.(rule, value, dataset, config, element) || `Missing required data attribute ${rule.datasetName}`
        };
      }

      return {
        value: rule.defaultValue,
        error: false,
        message: undefined
      };
    }

    if (validate && !validate(resolvedValue, dataset, config, element, rule)) {
      return {
        value: resolvedValue,
        error: true,
        message: messageBuilder?.(rule, resolvedValue, dataset, config, element) || `Invalid data attribute ${rule.datasetName}`
      };
    }

    return {
      value: resolvedValue,
      error: false,
      message: undefined
    };
  };
}

const RULES = {
  type: createRule({
    key: 'type',
    datasetName: 'visType',
    kind: 'required',
    parseAndValidate: createPv({
      parser: parseRequiredString,
      validate: (value) => KNOWN_VIS_TYPES.includes(value),
      messageBuilder: (rule) => `Missing required data attribute ${rule.datasetName}`
    }),
    defaultValue: undefined
  }),
  control: createRule({
    key: 'control',
    datasetName: 'visControl',
    parseAndValidate: createPv({
      parser: parseOptionalString
    }),
    defaultValue: undefined
  }),
  linkedTable: createRule({
    key: 'linkedTable',
    datasetName: 'visLinkedTable',
    parseAndValidate: createPv({
      parser: parseOptionalString
    }),
    defaultValue: undefined
  }),
  taxonId: createRule({
    key: 'taxonId',
    datasetName: 'visTaxonid',
    parseAndValidate: createPv({
      parser: parseOptionalString
    }),
    defaultValue: undefined
  }),
  startDate: createRule({
    key: 'startDate',
    datasetName: 'visStartDate',
    kind: 'required',
    parseAndValidate: createPv({
      parser: parseOptionalDate,
      validate: (value) => Boolean(value),
      messageBuilder: (rule) => `Missing required data attribute ${rule.datasetName}`
    }),
    defaultValue: undefined
  }),
  endDate: createRule({
    key: 'endDate',
    datasetName: 'visEndDate',
    parseAndValidate: createPv({
      parser: parseOptionalDate
    }),
    defaultValue: undefined
  }),
  area: createRule({
    key: 'area',
    datasetName: 'visArea',
    parseAndValidate: createPv({
      parser: (value) => parseOptionalString(value)
    }),
    defaultValue: 'vc-all'
  }),
  boundaries: createRule({
    key: 'boundaries',
    datasetName: 'visBoundaries',
    parseAndValidate: createPv({
      parser: parseBoolean
    }),
    defaultValue: false
  }),
  gridStatsType: createRule({
    key: 'gridStatsType',
    datasetName: 'visGridStatsType',
    parseAndValidate: createPv({
      parser: parseOptionalString,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: undefined
  }),
  hectads: createRule({
    key: 'hectads',
    datasetName: 'visHectads',
    parseAndValidate: createPv({
      parser: parseBoolean,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: true
  }),
  mapType: createRule({
    key: 'mapType',
    datasetName: 'visMapType',
    parseAndValidate: createPv({
      parser: parseOptionalString,
      messageBuilder: undefined
    }),
    defaultValue: 'static'
  }),
  dotColour: createRule({
    key: 'dotColour',
    datasetName: 'visDotColour',
    parseAndValidate: createPv({parser: parseOptionalString}),
    defaultValue: ''
  }),
  transformation: createRule({
    key: 'transformation',
    datasetName: 'visTransformation',
    parseAndValidate: createPv({
      parser: parseOptionalString,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: ''
  }),
  dotShape: createRule({
    key: 'dotShape',
    datasetName: 'visDotShape',
    parseAndValidate: createPv({
      parser: parseOptionalString,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: 'circle'
  }),
  taxonGroup: createRule({
    key: 'taxonGroup',
    datasetName: 'visTaxonGroup',
    parseAndValidate: createPv({
      parser: parseOptionalString,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: ''
  }),
  expand: createRule({
    key: 'expand',
    datasetName: 'visExpand',
    parseAndValidate: createPv({
      parser: parseOptionalBoolean,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: undefined
  }),
  width: createRule({
    key: 'width',
    datasetName: 'visWidth',
    parseAndValidate: createPv({
      parser: parseOptionalPositiveNumber,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: undefined
  }),
  height: createRule({
    key: 'height',
    datasetName: 'visHeight',
    parseAndValidate: createPv({
      parser: parseOptionalPositiveNumber,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: undefined
  }),
  topN: createRule({
    key: 'topN',
    datasetName: 'visTopN',
    parseAndValidate: createPv({
      parser: parseOptionalPositiveInteger,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: 50
  }),
  year: createRule({
    key: 'year',
    datasetName: 'visYear',
    kind: 'required',
    parseAndValidate: createPv({
      parser: parseOptionalPositiveInteger,
      validate: (value) => Number.isFinite(value),
      messageBuilder: (rule) => `Missing required data attribute ${rule.datasetName}`
    }),
    defaultValue: undefined
  }),
  startYear: createRule({
    key: 'startYear',
    datasetName: 'visStartYear',
    parseAndValidate: createPv({
      parser: parseOptionalPositiveInteger,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: undefined
  }),
  endYear: createRule({
    key: 'endYear',
    datasetName: 'visEndYear',
    parseAndValidate: createPv({
      parser: parseOptionalPositiveInteger,
      validate: undefined,
      messageBuilder: undefined
    }),
    defaultValue: undefined
  })
};

// Need to add comments to rule definitions to describe what they do or maybe add it to the rule
// structure so that it can be reported.

// Continue to check, from temporl year chart down, that all the necessary attributes 
// are included below.

// Continue reformatting above code to remove validate: undefined, messageBuilder: undefined
// from the rule definitions becase createPv puts them in.

// Add the new data attributes for control-block.

// Enrich the start-date and end-date parsers to account for last-month, this-month, last-and-this-month
// and same for years.

// Need to add control option to al the tables and check that they respond to VC and group.
// I'm sure they were responding to VC selection at one point but I think it was  
// lost in the refactoring. Need to check that they respond to group selection too.
// May be best to wait until API for species stats is available.


const VIS_TYPE_RULE_SETS = {
  'control-block': ['area'],
  'species-map': ['taxonId', 'control', 'area', 'hectads', 'mapType', 'boundaries', 'dotShape', 'dotColour', 'transformation', 'dotShape', 'expand', 'width', 'height'],
  'grid-stats-map': ['gridStatsType', 'control', 'area', 'hectads', 'mapType', 'boundaries', 'dotShape', 'dotColour', 'transformation', 'expand', 'width', 'height'],
  'temporal-year-chart': ['taxonId', 'linkedTable', 'startYear', 'endYear', 'control', 'expand', 'width', 'height'],
  'new-species-table': ['startDate', 'endDate'],
  'increasing-species-table': ['topN'],
  'species-absent-since': ['year']
};

export function getVisAttributeSchema(visType) {
  const configuredRuleNames = VIS_TYPE_RULE_SETS[visType] || Object.keys(RULES);
  const configuredRules = configuredRuleNames
    .map((ruleName) => RULES[ruleName])
    .filter(Boolean);

  const rules = [RULES.type, ...configuredRules.filter((rule) => rule.key !== 'type')];

  return {
    visType,
    rules
  };
}

export function getKnownVisTypes() {
  return [...KNOWN_VIS_TYPES];
}
