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

function validateDate(dateString) {
  // Regex strictly enforces dd-mm-yyyy syntax with digits
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  // Split components into integers
  const parts = dateString.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);

  if (month < 1 || month > 12) return false;

  // Days allowed per month (Index 0 is a placeholder)
  const monthLengths = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  // Adjust for leap years
  // Divisible by 4 AND (not divisible by 100 OR divisible by 400)
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    monthLengths[2] = 29;
  }

  // Validate day bounds for the specific month
  return day > 0 && day <= monthLengths[month];
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
  defaultValue,
  info=''
}) {
  return {
    key,
    datasetName,
    kind,
    parseAndValidate,
    defaultValue,
    info
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
    info: `The type of visualization to render. Must be one of: 
      ${KNOWN_VIS_TYPES.join(', ')}.`
  }),
  control: createRule({
    key: 'control',
    datasetName: 'visControl',
    parseAndValidate: createPv({parser: parseOptionalString}),
    info: `The id of a control block to link to this visualisation. 
      The visualisation will respond to selections made in that control.`
  }),
  linkedTable: createRule({
    key: 'linkedTable',
    datasetName: 'visLinkedTable',
    parseAndValidate: createPv({parser: parseOptionalString}),
    info: `The id of a linked table to subscribe to for species 
      selection events. When a species is selected in the linked table, 
      the visualization will be re-rendered with the selected species.`
  }),
  taxonId: createRule({
    key: 'taxonId',
    datasetName: 'visTaxonid',
    parseAndValidate: createPv({parser: parseOptionalString}),
    info: `The taxon ID of the species to visualize. This is used to 
      fetch data for the visualization.`
  }),
  startDate: createRule({
    key: 'startDate',
    datasetName: 'visStartDate',
    kind: 'required',
    parseAndValidate: (value, dataset, config, element, rule) => {
      const ret = {value: undefined, error: undefined, message: undefined};
      // Validate and resolve the date
      if (validateDate(value)) {
        ret.value = value;
      } else if (value === 'this-month') {
        const now = new Date();
        ret.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (value === 'last-month') {
        const last = new Date();
        last.setDate(1); // Avoids bugs when transitioning from 31-day months
        last.setMonth(last.getMonth() - 1);
        ret.value = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (value === 'this-year') {
        const now = new Date();
        ret.value = `${now.getFullYear()}-01-01`;
      } else if (value === 'last-year') {
        const now = new Date();
        ret.value = `${now.getFullYear() - 1}-01-01`;
      } else {
        ret.error = true;
        ret.message = `Invalid data attribute ${rule.datasetName}: ${value}. ${rule.info}`;
      }
      return ret;
    },
    defaultValue: 'last-month',
    info: `The start date for period from which to draw data. This can be a 
    specific date string of the format 'yyyy-mm-dd' or one of these relative date
    strings: 'this-month' which resolves to the first day of the current month;
    'last-month' which resolves to the first day of the previous month;
    'this-year' which resolves to the first day of the current year; or
    'last-year' which resolves to the first day of the previous year.`
  }),
  endDate: createRule({
    key: 'endDate',
    datasetName: 'visEndDate',
    parseAndValidate: (value, dataset, config, element, rule) => {
      const ret = {value: value, error: undefined, message: undefined};
    
      return ret;
    },
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
