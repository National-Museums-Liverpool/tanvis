const KNOWN_VIS_TYPES = [
  'control-block',
  'species-map',
  'new-species-table',
  'increasing-species-table',
  'species-absent-since',
  'grid-stats-map',
  'temporal-year-chart'
];

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

function infoString(value, rule) {
  let ret =  `Invalid value for data attribute ${rule.datasetName}: ${value}. ${rule.info}`;
  if (rule.defaultValue) {
    ret = `${ret} Default value is ${rule.defaultValue}.`;
  }
  return ret;
}

function requiredButMissing(value, dataset, config, element, rule) {
  if ((typeof(value) === 'undefined' || value === null || value === '') && rule.kind === 'required') {
    return {  
      value: undefined,
      error: true,
      message: `Missing required data attribute ${rule.datasetName}. ${rule.info}`
    };
  } else {
    return null;
  }
}

function parseAndValidateBoolean (value, dataset, config, element, rule) {
  const ret = {value: undefined, error: undefined, message: undefined};

  // Check if the value is required
  const rm = requiredButMissing(value, dataset, config, element, rule);
  if (rm) return rm;

  if (typeof(value) === 'undefined' || value === null || value === '') {
    // Set default if missing
    ret.value = rule.defaultValue;
  }  else {
    // Values must be either 'true' or 'false'
    if (value !== 'true' && value !== 'false') {
      ret.error = true;
      ret.message = infoString(value, rule);
    } else {
      ret.value = value === 'true';
    }
  }
  return ret;
}

function parseAndValidateString (value, dataset, config, element, rule) {
  const ret = {value: undefined, error: undefined, message: undefined};
  
  // Check if the value is required
  const rm = requiredButMissing(value, dataset, config, element, rule);
  if (rm) return rm;

  if (typeof(value) === 'undefined' || value === null || value === '') {
    // Set default if missing
    ret.value = rule.defaultValue;
  } else {
    ret.value = value;
  }
  return ret;
}

function parseAndValidateSet(value, dataset, config, element, rule) {
  const ret = {value: undefined, error: undefined, message: undefined};

  // Check if the value is required
  const rm = requiredButMissing(value, dataset, config, element, rule);
  if (rm) return rm;

  
  if (typeof(value) === 'undefined' || value === null || value === '') {
    // Set default if missing
    ret.value = rule.defaultValue;
  } else {
    // Validate that the value is in the allowed set
    if (!rule.allowedValues?.includes(value)) {
      ret.error = true;
      ret.message = infoString(value, rule);
      return ret;
    }
    ret.value = value;
  }
  return ret;
}

function parseAndValidatePositiveInteger(value, dataset, config, element, rule) {
  const ret = {value: undefined, error: undefined, message: undefined};

  // Check if the value is required
  const rm = requiredButMissing(value, dataset, config, element, rule);
  if (rm) return rm;

  if (typeof(value) === 'undefined' || value === null || value === '') {
    // Set default if missing
    ret.value = rule.defaultValue;
  } else {
    // Validate that the value is a positive integer
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      ret.error = true;
      ret.message = infoString(value, rule);
      return ret;
    }
    ret.value = parsed;
  }

  return ret;
}

function parseAndValidateYear(value, dataset, config, element, rule) {
  const ret = {value: undefined, error: undefined, message: undefined};

  // Set default if missing
  if (typeof(value) === 'undefined' || value === null || value === '') {
    value = rule.defaultValue;
  }  
  // Validate and resolve the year
  // - must run on default value in order to parse shorthand year 
  // values like 'year-1' into a specific year
  if (/^\d{4}$/.test(value)) {
    const year = parseInt(value, 10);
    if (year >= 1000 && year <= 3000) {
      ret.value = value;
    } else {
      ret.error = true;
      ret.message = infoString(value, rule);
    }
  } else if (/^year-\d+$/.test(value)) {
    const n = parseInt(value.split('-')[1], 10);
    const now = new Date();
    now.setDate(1);
    ret.value = `${now.getFullYear() - n}`;
  } else {
    ret.error = true;
    ret.message = infoString(value, rule);
  }
  return ret;
}

function createRule({
  key,
  datasetName,
  kind = 'optional',
  parseAndValidate,
  allowedValues,
  defaultValue,
  info=''
}) {
  return {
    key,
    datasetName,
    kind,
    parseAndValidate,
    allowedValues,
    defaultValue,
    info
  };
}

const RULES = {
  type: createRule({
    key: 'type',
    datasetName: 'visType',
    kind: 'required',
    parseAndValidate: parseAndValidateSet,
    allowedValues: KNOWN_VIS_TYPES,
    info: `The type of visualization to render. Must be one of: 
      ${KNOWN_VIS_TYPES.join(', ')}.`
  }),
  control: createRule({
    key: 'control',
    datasetName: 'visControl',
    parseAndValidate: parseAndValidateString,
    info: `The id of a control block to link to this visualisation. 
      The visualisation will respond to selections made in that control.`
  }),
  controlElements: createRule({
    key: 'controlElements',
    datasetName: 'visControlElements',
    parseAndValidate: (value, dataset, config, element, rule) => {
      const ret = {value: undefined, error: undefined, message: undefined};

      const rm = requiredButMissing(value, dataset, config, element, rule);
      if (rm) return rm;

      if (typeof(value) === 'undefined' || value === null || value === '') {
        ret.value = rule.defaultValue;
      } else {
        const allowedVals = new Set(['area', 'groups', 'language', 'species']);
        const vals = value.split(/\s+/).map((token) => token.trim()).filter(Boolean);
        const hasInvalid = vals.some((token) => !allowedVals.has(token));
        if (hasInvalid) {
          ret.error = true;
          ret.message = infoString(value, rule);
        } else {
          ret.value = vals.join(' ');
        }
      }
      return ret;
    },
    defaultValue: 'area groups language species',
    info: `A space-separated list of control-block sections to show. Allowed values are: area, groups, language, species.`
  }),
  showDataOptsToggle: createRule({
    key: 'showDataOptsToggle',
    datasetName: 'visShowDataOptsToggle',
    parseAndValidate: parseAndValidateBoolean,
    defaultValue: true,
    info: `Whether to show the data options toggle above the control block.` 
  }),
  showDataOptsExpanded: createRule({
    key: 'showDataOptsExpanded',
    datasetName: 'visShowDataOptsExpanded',
    parseAndValidate: parseAndValidateBoolean,
    defaultValue: true,
    info: `Whether to show the data options expanded in the control block.` 
  }),
  linkedTable: createRule({
    key: 'linkedTable',
    datasetName: 'visLinkedTable',
    parseAndValidate: parseAndValidateString,
    info: `The id of a linked table to subscribe to for species 
      selection events. When a species is selected in the linked table, 
      the visualization will be re-rendered with the selected species.`
  }),
  taxonId: createRule({
    key: 'taxonId',
    datasetName: 'visTaxonid',
    parseAndValidate: parseAndValidateString,
    info: `The taxon ID of the species to visualize. This is used to 
      fetch data for the visualization.`
  }),
  groupId: createRule({
    key: 'groupId',
    datasetName: 'visGroupid',
    parseAndValidate: parseAndValidateString,
    info: `The taxon group ID to filter the data by or initialise the control block.`
  }),
  language: createRule({
    key: 'language',
    datasetName: 'visLanguage',
    parseAndValidate: parseAndValidateSet,
    allowedValues: ['scientific', 'vernacular'],
    defaultValue: 'scientific',
    info: `The language to use for taxon group labels. This can be either 'scientific' or 'vernacular'.`
  }),
  startDate: createRule({
    key: 'startDate',
    datasetName: 'visStartDate',
    parseAndValidate: (value, dataset, config, element, rule) => {
      const ret = {value: undefined, error: undefined, message: undefined};

      // Set default if missing
      if (typeof(value) === 'undefined' || value === null || value === '') {
        value = rule.defaultValue;
      }  

      // Validate and resolve the date -
      // must run on default value in order to parse shorthand date 
      // values like 'month-1' or 'year-1' into a specific date.
      if (validateDate(value)) {
        ret.value = value;
      } else if (/^month-\d+$/.test(value)) {
        const n = parseInt(value.split('-')[1], 10);
        const now = new Date();
        now.setDate(1);
        now.setMonth(now.getMonth() - n);
        ret.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (/^year-\d+$/.test(value)) {
        const n = parseInt(value.split('-')[1], 10);
        const now = new Date();
        now.setDate(1);
        ret.value = `${now.getFullYear() - n}-01-01`;
      } else {
        ret.error = true;
        ret.message = infoString(value, rule);;
      }
      return ret;
    },
    defaultValue: 'year-1',
    info: `The start date for period from which to draw data. This can be a 
      specific date string of the format 'yyyy-mm-dd' or one of these relative date
      values: 'month-n', where n is any integer, which resolves to the first day of the current month minus n months
      (e.g. month-0 is the first day of the current month, month-1 is the first day of the previous month, etc.);
      or 'year-n', where n is any integer, which resolves to the first day of the current year minus n years
      (e.g. year-0 is the first day of the current year, year-1 is the first day of the previous year, etc.).`
  }),
  endDate: createRule({
    key: 'endDate',
    datasetName: 'visEndDate',
    parseAndValidate: (value, dataset, config, element, rule) => {
      const ret = {value: undefined, error: undefined, message: undefined};

      // Set default if missing
      if (typeof(value) === 'undefined' || value === null || value === '') {
        value = rule.defaultValue;
      }      

      // Validate and resolve the date -
      // must run on default value in order to parse shorthand date 
      // values like 'month-1' or 'year-1' into a specific date.
      if (validateDate(value)) {
        ret.value = value;
      } else if (/^month-\d+$/.test(value)) {
        const n = parseInt(value.split('-')[1], 10);
        const now = new Date();
        now.setDate(1);
        now.setMonth(now.getMonth() - n);
        ret.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
      } else if (/^year-\d+$/.test(value)) {
        const n = parseInt(value.split('-')[1], 10);
        const now = new Date();
        now.setDate(1);
        ret.value = `${now.getFullYear() - n}-12-31`;
      } else {
        ret.error = true;
        ret.message = infoString(value, rule);
      }
      return ret;
    },
    defaultValue: 'year-1',
    info: `The end date for period from which to draw data. This can be a 
      specific date string of the format 'yyyy-mm-dd' or one of these relative date
      values: 'month-n', where n is any integer, which resolves to the last day of the current month minus n months
      (e.g. month-0 is the last day of the current month, month-1 is the last day of the previous month, etc.);
      or 'year-n', where n is any integer, which resolves to the last day of the current year minus n years
      (e.g. year-0 is the last day of the current year, year-1 is the last day of the previous year, etc.).`
  }),
  area: createRule({
    key: 'area',
    datasetName: 'visArea',
    parseAndValidate: (value, dataset, config, element, rule) => {
      const ret = parseAndValidateSet(value, dataset, config, element, rule);
      if (ret.error) {
        return ret;
      }
      if (ret.value === 'vc-all') {
        ret.value = '';
      } else if (typeof ret.value === 'string' && /^vc-\d+$/.test(ret.value)) {
        ret.value = parseInt(ret.value.substring(3), 10);
      } else {
        ret.error = true;
        ret.message = infoString(value, rule);
      }
      return ret;
    },
    allowedValues: ['vc-58', 'vc-59', 'vc-60', 'vc-all'],
    defaultValue: 'vc-all',
    info: `The vice county area to visualize. This can be one of the following values: 
      'vc-58', 'vc-59', 'vc-60' or 'vc-all'. 
      Note that if a control block is linked to this visualisation, the area will be determined by 
      the control block selection and this attribute will be ignored.`
  }),
  boundaries: createRule({
    key: 'boundaries',
    datasetName: 'visBoundaries',
    parseAndValidate: parseAndValidateBoolean,
    defaultValue: true,
    info: `Whether to show boundaries on the map visualizations - Leaflet maps only,
      the boundary is always displayed on the static map. This is a boolean value.`
  }),
  gridStatsType: createRule({
    key: 'gridStatsType',
    datasetName: 'visGridStatsType',
    parseAndValidate: parseAndValidateSet,
    allowedValues: ['species', 'records', 'rarity', 'switch'],
    defaultValue: 'species',
    info: `The type of grid statistics to visualize. This can be one of the following values:
      'species' - to visualize species counts,
      'records' - to visualize record counts,
      'rarity' - to visualize rarity scores,
      'switch' - provide a control to switch between different grid statistics.`
  }),
  hectads: createRule({
    key: 'hectads',
    datasetName: 'visHectads',
    parseAndValidate: parseAndValidateBoolean,
    defaultValue: true,
    info: `Whether to show hectad grid lines on the map visualizations. This is a boolean value.`
  }),
  mapType: createRule({
    key: 'mapType',
    datasetName: 'visMapType',
    parseAndValidate: parseAndValidateSet,
    allowedValues: ['static', 'leaflet', 'switch'],
    defaultValue: 'static',
    info: `The type of map to render. This can be one of the following values:
      'static' - to render a classic atlas map,
      'leaflet' - to render an interactive Leaflet map,
      'switch' - provide a control to switch between different map types.`
  }),
  dotColour: createRule({
    key: 'dotColour',
    datasetName: 'visDotColour',
    parseAndValidate: parseAndValidateString,
    defaultValue: 'black',
    info: `The colour of the dots on the map visualizations. 
      This can be any valid CSS colour value.`
  }),
  transformation: createRule({
    key: 'transformation',
    datasetName: 'visTransformation',
    parseAndValidate: parseAndValidateSet,
    allowedValues: ['none', 'deciles', 'sqrt', 'cbrt', 'log10', 'log'],
    defaultValue: 'none',
    info: `The type of transformation to apply to the data. This can be one of the following values:
      'none' - no transformation,
      'deciles' - transform to deciles,
      'sqrt' - square root transformation,
      'cbrt' - cube root transformation,
      'log10' - base-10 logarithm transformation,
      'log' - logarithmic transformation.`
  }),
  dotShape: createRule({
    key: 'dotShape',
    datasetName: 'visDotShape',
    parseAndValidate: parseAndValidateSet,
    allowedValues: ['circle', 'square'],
    defaultValue: 'circle',
    info: `The shape of the dots on the map visualizations. This can be one of the following values:
      'circle' or 'square'.`
  }),
  taxonGroup: createRule({
    key: 'taxonGroup',
    datasetName: 'visTaxonGroup',
    parseAndValidate: parseAndValidateString,
    info: `The taxon group to filter the data by. This can be any valid taxon group identifier.
      If not specified, data will not be filtered by taxon group. Note that if a control block is 
      linked to this visualisation, the taxon group will be determined by the control block selection.`
  }),
  expand: createRule({
    key: 'expand',
    datasetName: 'visExpand',
    parseAndValidate: parseAndValidateBoolean,
    defaultValue: false,
    info: `Whether to expand the visualization to fill its container. Can be 'true' or 'false'`
  }),
  width: createRule({
    key: 'width',
    datasetName: 'visWidth',
    parseAndValidate: parseAndValidatePositiveInteger,
    info: `The width of the visualization in pixels. Must be a positive integer.`
  }),
  height: createRule({
    key: 'height',
    datasetName: 'visHeight',
    parseAndValidate: parseAndValidatePositiveInteger,
    info: `The height of the visualization in pixels. Must be a positive integer.`
  }),
  topN: createRule({
    key: 'topN',
    datasetName: 'visTopN',
    parseAndValidate: parseAndValidatePositiveInteger,
    defaultValue: 50,
    info: `The number of top species to display. Must be a positive integer.`
  }),
  pageSize: createRule({
    key: 'pageSize',
    datasetName: 'visPageSize',
    parseAndValidate: parseAndValidatePositiveInteger,
    defaultValue: 15,
    info: `The number of records to display per page in table visualizations. Must be a positive integer.`
  }),
  year: createRule({
    key: 'year',
    datasetName: 'visYear',
    parseAndValidate: parseAndValidateYear,
    defaultValue: '2000',
    info: `The year for which to draw data. This can be a specific year string of 
      the format 'yyyy' or one of these relative year values: 'year-n', where n is
      any integer, which resolves to the current year minus n years (e.g. year-0 is 
      the current year, year-1 is the previous year, etc.).`
  }),
  startYear: createRule({
    key: 'startYear',
    datasetName: 'visStartYear',
    parseAndValidate: parseAndValidateYear,
    defaultValue: '2000',
    info: `The start year for the data. This can be a specific year string of 
      the format 'yyyy' or one of these relative year values: 'year-n', where n is
      any integer, which resolves to the current year minus n years (e.g. year-0 is 
      the current year, year-1 is the previous year, etc.).`
  }),
  endYear: createRule({
    key: 'endYear',
    datasetName: 'visEndYear',
    parseAndValidate: parseAndValidateYear,
    defaultValue: '2000',
    info: `The end year for the data. This can be a specific year string of 
      the format 'yyyy' or one of these relative year values: 'year-n', where n is
      any integer, which resolves to the current year minus n years (e.g. year-0 is 
      the current year, year-1 is the previous year, etc.).`
  })
};

// Add the new data attributes for control-block.

const VIS_TYPE_RULE_SETS = {
  'control-block': ['area', 'groupId', 'language','controlElements', 'showDataOptsToggle', 'showDataOptsExpanded'],
  'species-map': ['taxonId', 'control', 'area', 'hectads', 'mapType', 'boundaries', 'dotShape', 'dotColour', 'transformation', 'dotShape', 'expand', 'width', 'height'],
  'grid-stats-map': ['gridStatsType', 'control', 'area', 'hectads', 'mapType', 'boundaries', 'dotShape', 'dotColour', 'transformation', 'expand', 'width', 'height'],
  'temporal-year-chart': ['taxonId', 'linkedTable', 'startYear', 'endYear', 'area', 'control', 'expand', 'width', 'height'],
  'new-species-table': ['startDate', 'endDate', 'area', 'groupId', 'language','control', 'pageSize'],
  'increasing-species-table': ['topN', 'area', 'groupId', 'language','control', 'pageSize'],
  'species-absent-since': ['year', 'area', 'groupId', 'language','control', 'pageSize']
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
