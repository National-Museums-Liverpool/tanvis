var Tanvis = (function (exports) {
  'use strict';

  function scan(root, selector = '.tanvis') {
    if (!root || typeof root.querySelectorAll !== 'function') {
      return [];
    }

    return Array.from(root.querySelectorAll(selector));
  }

  const KNOWN_VIS_TYPES = [
    'control-block',
    'species-identifier',
    'species-map',
    'new-species-table',
    'increasing-species-table',
    'species-absent-since',
    'grid-stats-map',
    'temporal-year-chart',
    'species-name-block',
    'species-remarks-block',
    'species-info-block',
    'help-block',
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

  // Converts a dataset property name (e.g. 'visType') to the HTML data
  // attribute name authors actually write in markup (e.g. 'data-vis-type').
  function toDataAttributeName(datasetName) {
    return `data-${datasetName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
  }

  function infoString(value, rule) {
    let ret =  `Invalid value for data attribute ${toDataAttributeName(rule.datasetName)}: ${value}. ${rule.info}`;
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
        message: `Missing required data attribute ${toDataAttributeName(rule.datasetName)}. ${rule.info}`
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

  function parseAndValidateColour(value, dataset, config, element, rule) {
    const ret = {value: undefined, error: undefined, message: undefined};
    // Check if the value is required
    const rm = requiredButMissing(value, dataset, config, element, rule);
    if (rm) return rm;

    if (typeof(value) === 'undefined' || value === null || value === '') {
      // Set default if missing
      ret.value = rule.defaultValue;
    } else {
      // Basic validation for CSS colour string (can be improved)
      if (!CSS.supports("color", value)) {
        ret.error = true;
        ret.message = infoString(value, rule);
      } else {
        ret.value = value;
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
        ret.value = year;
      } else {
        ret.error = true;
        ret.message = infoString(value, rule);
      }
    } else if (/^year-\d+$/.test(value)) {
      const n = parseInt(value.split('-')[1], 10);
      const now = new Date();
      now.setDate(1);
      ret.value = now.getFullYear() - n;
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
      info: `The type of visualisation to render. Must be one of: 
      ${KNOWN_VIS_TYPES.join(', ')}.`
    }),
    control: createRule({
      key: 'control',
      datasetName: 'visControl',
      parseAndValidate: parseAndValidateString,
      info: `The id of a control block to link to this visualisation. 
      The visualisation will respond to control-bus selections made in that control,
      such as area and taxon-group changes.`
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
    taxonIdSource: createRule({
      key: 'taxonIdSource',
      datasetName: 'visTaxonIdSource',
      parseAndValidate: parseAndValidateString,
      info: `The id of a tanvis control or visualisation to subscribe to for taxon-identified 
      events. When a species is selected in the linked visualisation or control-block species selector, 
      the taxonId of that species will be used to update this visualisation and
      the visualisation will be re-rendered with the selected species.`
    }),
    taxonId: createRule({
      key: 'taxonId',
      datasetName: 'visTaxonid',
      parseAndValidate: parseAndValidateString,
      info: `The taxon ID of the species to visualize. This is used to 
      fetch data for the visualisation.`
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
          ret.message = infoString(value, rule);      }
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
      info: `Whether to show boundaries on the map visualisations - Leaflet maps only,
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
    temporalStatsType: createRule({
      key: 'temporalStatsType',
      datasetName: 'visTemporalStatsType',
      parseAndValidate: parseAndValidateSet,
      allowedValues: ['records', 'squares', 'switch'],
      defaultValue: 'records',  
      info: `The type of temporal statistics to visualize. This can be one of the following values:
      'records' - to visualize record counts,
      'squares' - to visualize square counts,
      'switch' - provide a control to switch between different temporal statistics.`
    }), 
    hectads: createRule({
      key: 'hectads',
      datasetName: 'visHectads',
      parseAndValidate: parseAndValidateBoolean,
      defaultValue: true,
      info: `Whether to show hectad grid lines on the map visualisations. This is a boolean value.`
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
      info: `The colour of the dots on the map visualisations. 
      This can be any valid CSS colour value, or one of either 'viridis'
      or 'cividis' - two colour-blind safe colour palettes. 
      If one of the latter palettes is used, the colours will be determined
      by the value of a for each dot. For species maps, that is the number
      of records and for grid stats maps either the number of species, 
      number of records or rarity score.`
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
      info: `The shape of the dots on the map visualisations. This can be one of the following values:
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
      info: `Whether to expand the visualisation to fill its container. Can be 'true' or 'false'`
    }),
    width: createRule({
      key: 'width',
      datasetName: 'visWidth',
      parseAndValidate: parseAndValidatePositiveInteger,
      info: `The width of the visualisation in pixels. Must be a positive integer.`
    }),
    height: createRule({
      key: 'height',
      datasetName: 'visHeight',
      parseAndValidate: parseAndValidatePositiveInteger,
      info: `The height of the visualisation in pixels. Must be a positive integer.`
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
      info: `The number of records to display per page in table visualisations. Must be a positive integer.`
    }),
    year: createRule({
      key: 'year',
      datasetName: 'visYear',
      parseAndValidate: parseAndValidateYear,
      defaultValue: '2000',
      info: `The year after (and including) which taxa are not recorded. 
      This can be a specific year string of 
      the format 'yyyy' or one of these relative year values: 'year-n', where n is
      any integer, which resolves to the current year minus n years (e.g. year-0 is 
      the current year, year-1 is the previous year, etc.).`
    }),
    startYear: createRule({
      key: 'startYear',
      datasetName: 'visStartYear',
      parseAndValidate: parseAndValidateYear,
      defaultValue: 'year-11',
      info: `The start year for the data. This can be a specific year string of 
      the format 'yyyy' or one of these relative year values: 'year-n', where n is
      any integer, which resolves to the current year minus n years (e.g. year-0 is 
      the current year, year-1 is the previous year, etc.).`
    }),
    endYear: createRule({
      key: 'endYear',
      datasetName: 'visEndYear',
      parseAndValidate: parseAndValidateYear,
      defaultValue: 'year-3',
      info: `The end year for the data. This can be a specific year string of 
      the format 'yyyy' or one of these relative year values: 'year-n', where n is
      any integer, which resolves to the current year minus n years (e.g. year-0 is 
      the current year, year-1 is the previous year, etc.).`
    }),
    chartType: createRule({
      key: 'chartType',
      datasetName: 'visChartType',
      parseAndValidate: parseAndValidateSet,
      allowedValues: ['line', 'bar'],
      defaultValue: 'line',
      info: `The type of chart to render. This can be one of the following values:
      'line' - to render a line chart,
      'bar' - to render a bar chart.`
    }),
    recordsColour: createRule({
      key: 'recordsColour',
      datasetName: 'visRecordsColour',
      parseAndValidate: parseAndValidateColour,
      defaultValue: '#1d4ed8',
      info: `The colour to use for records in the chart. Must be a valid CSS colour string.`
    }),
    squaresColour: createRule({
      key: 'squaresColour',
      datasetName: 'visSquaresColour',
      parseAndValidate: parseAndValidateColour,
      defaultValue: '#c2410c',
      info: `The colour to use for squares in the chart. Must be a valid CSS colour string.`
    }),
    primaryName: createRule({
      key: 'primaryName',
      datasetName: 'visPrimaryName',
      allowedValues: ['vernacular', 'scientific'],
      defaultValue: 'scientific',
      parseAndValidate: parseAndValidateSet,
      info: `The first name to display in the species name block.`
    }),
    secondaryName: createRule({
      key: 'secondaryName',
      datasetName: 'visSecondaryName',
      allowedValues: ['vernacular', 'scientific', 'none'],
      defaultValue: 'vernacular',
      parseAndValidate: parseAndValidateSet,
      info: `The second name to display in the species name block. This
      can be 'none', in which case only the primary name will be displayed.
      The secondary name is always shown in parentheses after the primary 
      name.`
    }),
    authority: createRule({
      key: 'authority',
      datasetName: 'visAuthority',
      parseAndValidate: parseAndValidateBoolean,
      defaultValue: true,
      info: `Whether to include the scientific name authority 
      if the scientific name is shown in the species name block.
      The value is ignored if the scientific name is not shown.`
    })
  };

  // Add the new data attributes for control-block.

  const VIS_TYPE_RULE_SETS = {
    'control-block': ['area', 'groupId', 'language','controlElements', 'showDataOptsToggle', 'showDataOptsExpanded'],
    'species-identifier': ['taxonId'],
    'species-map': ['taxonId', 'taxonIdSource', 'control', 'area', 'hectads', 'mapType', 'boundaries', 'dotShape', 'dotColour', 'transformation', 'dotShape', 'expand', 'width', 'height'],
    'grid-stats-map': ['gridStatsType', 'control', 'area', 'hectads', 'mapType', 'boundaries', 'dotShape', 'dotColour', 'transformation', 'expand', 'width', 'height'],
    'temporal-year-chart': ['taxonId', 'temporalStatsType', 'taxonIdSource', 'chartType', 'recordsColour', 'squaresColour','startYear', 'endYear', 'area', 'control', 'expand', 'width', 'height'],
    'new-species-table': ['startDate', 'endDate', 'area', 'groupId', 'language','control', 'pageSize'],
    'increasing-species-table': ['topN', 'area', 'groupId', 'language','control', 'pageSize'],
    'species-absent-since': ['year', 'area', 'groupId', 'language','control', 'pageSize'],
    'species-name-block': ['taxonId', 'taxonIdSource', 'primaryName', 'secondaryName', 'authority'],
    'species-remarks-block': ['taxonId', 'taxonIdSource'],
    'species-info-block': ['taxonId', 'taxonIdSource', 'control', 'area'],
    'help-block': []
  };

  const VIS_TYPE_DESCRIPTIONS = {
    'control-block': `A control block for selecting area, taxon group, language and taxon.
    Any visualisations on the page can subscribe to it to control their data and rendering.
    The four elements of the control block can be shown or hidden individually.`,
    'species-identifier': `This is not a visualisation itself but a hidden element that can be 
    used to identify a taxon and provide its taxonId to other visualisations. It provides
    a way to specify a taxonId once and have several visualisations on the page respond to it. 
    When included on a page, it also examines the URL for a 'taxon-id' query parameter 
    and uses that to set the taxonId if present. Any visualisation on the page subscribed to 
    this element will receive taxonId updates when the taxonId changes.`,
    'species-map': `A map showing the distribution of a species. It can be configured
    to display a classic atlas map ('static') or an interactive Leaflet map ('leaflet'). Alternatively,
    a control can be provided to switch between the two map types.
    The map can show dots for records, grid squares, or both. The map can also show VC boundaries 
    and (for static only) hectad grid lines.`,
    'grid-stats-map': `A map showing grid-based statistics. It can be configured
    to display a classic atlas map ('static') or an interactive Leaflet map ('leaflet'). Alternatively,
    a control can be provided to switch between the two map types.
    The map can show dots for records, grid squares, or both. The map can also show VC boundaries 
    and (for static only) hectad grid lines.`,
    'temporal-year-chart': `A chart showing temporal trends for a species. It can be
    configured to show either a line chart or a bar chart. The chart can show either the number 
    of records or the number of grid squares for each year. Alternatively, it can be configured
    to display a control to switch between the two chart types.`,
    'new-species-table': `A table showing newly recorded species between a given start and end date. 
    The table can be filtered by area and taxon group, either directly or via a linked control block.`,
    'increasing-species-table': `A table showing the top 'N' (configurable) increasing 
    species based on a trend statistic. The table can be filtered by area and taxon group, either 
    directly or via a linked control block.`,
    'species-absent-since': `A table showing species not recorded since a given year. The table can 
    be filtered by area and taxon group, either directly or via a linked control block.`,
    'species-name-block': `A block visualisation showing the name of a species. Some default
    styling is applied to the name, but it can be overridden with CSS. The block can show either
    the scientific name or the vernacular name first, and can optionally show the other name in parentheses.
    If the scientific name is shown, the authority can also be shown.`,
    'species-remarks-block': `A block visualisation showing remarks for a species.`,
    'species-info-block': `A block visualisation showing information for a species, including 
    its conservation status, a summary of the number of records and number of grid squares.`,
    'help-block': `A block visualisation showing help information.`
  };

  function getVisAttributeSchema(visType) {
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

  function getKnownVisTypes() {
    return [...KNOWN_VIS_TYPES];
  }

  function getDataAttributeName(rule) {
    return toDataAttributeName(rule.datasetName);
  }

  function getVisTypeDescription(visType) {
    return VIS_TYPE_DESCRIPTIONS[visType] || '';
  }

  function parseOptions(element) {
    const dataset = element?.dataset || {};
    const schema = getVisAttributeSchema(dataset.visType);
    const config = {};

    for (const rule of schema.rules) {
      const rawValue = dataset[rule.datasetName];
      const result = rule.parseAndValidate?.(rawValue, dataset, config, element, rule);
      const resolvedValue = result?.value ?? rule.defaultValue;

      config[rule.key] = resolvedValue;
    }

    return config;
  }

  function validateAttributes(config, element) {
    const schema = getVisAttributeSchema(config?.type);

    for (const rule of schema.rules) {
      const value = config?.[rule.key];
      const result = rule.parseAndValidate?.(datasetValueForRule(rule, config, element), config, config, element, rule);

      if (result?.error) {
        return [result.message];
      }

      if (rule.kind === 'required' && (value === undefined || value === null || value === '')) {
        return [`Missing required data attribute ${rule.datasetName}`];
      }
    }

    // if (config?.type === 'control-block' && !element?.id) {
    //   return ['Missing id attribute for control-block'];
    // }

    return [];
  }

  function datasetValueForRule(rule, config, element) {
    return element?.dataset?.[rule.datasetName];
  }

  const renderers = new Map();

  function registerRenderer(name, renderer) {
    renderers.set(name, renderer);
  }

  function getRenderer(name) {
    return renderers.get(name);
  }

  // The object 'dataset' is the standard browser API for HTML data-* attributes.
  // When code sets something like: element.dataset.tanvisRendered = 'true'
  // the browser reflects that as: data-tanvis-rendered="true" on the element in the DOM.

  function markRendered(element) {
    element.dataset.tanvisRendered = 'true';
  }

  function warn(message) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[tanvis] ${message}`);
    }
  }

  const VIS_STATUS_CLASS = 'tanvis-vis-status';
  const VIS_STATUS_STYLES_ID = 'tanvis-vis-status-styles';
  const VIS_STATUS_STYLES = `
.${VIS_STATUS_CLASS} {
  margin: 0.5rem 0 0;
  color: #4b5563;
  font: 500 0.85rem/1.3 system-ui, sans-serif;
}

.${VIS_STATUS_CLASS}.is-error {
  color: #9f1239;
}

.${VIS_STATUS_CLASS}.is-info {
  color: #92400e;
}
`;

  function createVisStatusReporter(container) {
    ensureVisStatusStyles();

    return {
      showInfo(message) {
        showStatus(container, message, 'info');
      },
      showError(message) {
        showStatus(container, message, 'error');
      },
      clear() {
        clearStatus(container);
      }
    };
  }

  function ensureStylesheetDependency(reporter, { libraryName, stylesheetHints, message }) {
    if (typeof document === 'undefined' || !document.head) {
      return true;
    }

    const hints = Array.isArray(stylesheetHints)
      ? stylesheetHints.filter(Boolean)
      : [stylesheetHints].filter(Boolean);

    if (hints.length === 0) {
      return true;
    }

    const hasStylesheet = hints.some((hint) => hasStylesheetLink(hint));
    if (!hasStylesheet) {
      const resolvedMessage = message || `${libraryName} stylesheet is missing. Include ${hints[0]} to ensure the visualisation is styled correctly.`;
      reporter?.showInfo?.(resolvedMessage);
    }

    return hasStylesheet;
  }

  function showStatus(container, message, tone) {
    const status = ensureStatusElement(container);
    const classNames = [VIS_STATUS_CLASS];

    if (tone === 'error') {
      classNames.push('is-error');
    } else if (tone === 'info') {
      classNames.push('is-info');
    }

    status.className = classNames.join(' ');
    status.textContent = message || '';
  }

  function ensureStatusElement(container) {
    if (container.__tanvisVisStatusElement) {
      const status = container.__tanvisVisStatusElement;
      if (!status.isConnected) {
        container.insertBefore(status, container.firstChild);
      } else if (status.nextSibling && status.parentNode?.firstChild !== status) {
        container.insertBefore(status, container.firstChild);
      }
      return status;
    }

    const status = document.createElement('p');
    status.className = VIS_STATUS_CLASS;
    container.insertBefore(status, container.firstChild);
    container.__tanvisVisStatusElement = status;
    return status;
  }

  function clearStatus(container) {
    const status = container.__tanvisVisStatusElement;
    if (status?.parentNode) {
      status.parentNode.removeChild(status);
    }

    delete container.__tanvisVisStatusElement;
  }

  function hasStylesheetLink(stylesheetHint) {
    const normalizedHint = String(stylesheetHint || '').toLowerCase();
    if (!normalizedHint) {
      return false;
    }

    return Array.from(document.head.querySelectorAll('link[rel~="stylesheet"]')).some((link) => {
      const href = String(link.getAttribute('href') || '').toLowerCase();
      return href.includes(normalizedHint);
    });
  }

  function ensureVisStatusStyles() {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(VIS_STATUS_STYLES_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = VIS_STATUS_STYLES_ID;
    style.textContent = VIS_STATUS_STYLES;
    document.head.appendChild(style);
  }

  function render(element) {
    const config = parseOptions(element);
    const errors = validateAttributes(config, element);

    //console.log("config", element, config);

    const status = createVisStatusReporter(element);

    if (errors.length > 0) {
      status.showError(errors[0]);
      warn(errors[0]);
      return { rendered: false, errors };
    }

    const renderer = getRenderer(config.type);

    if (!renderer) {
      const message = `No renderer registered for type "${config.type}"`;
      status.showError(message);
      warn(message);
      return { rendered: false, errors: [message] };
    }

    renderer(element, config);
    markRendered(element);

    return { rendered: true, errors: [] };
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function getPayloadMessage(payload) {
    if (!payload || typeof payload !== 'object') {
      return '';
    }

    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      return payload.detail.trim();
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error.trim();
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }

    return '';
  }

  async function parseJsonSafe(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function createApiError({ response, payload, defaultMessage, cause } = {}) {
    const payloadMessage = getPayloadMessage(payload);
    const causeMessage = typeof cause?.message === 'string' ? cause.message.trim() : '';
    const fallbackMessage = defaultMessage || 'Request failed';
    const message = payloadMessage || causeMessage || fallbackMessage;

    const error = new Error(message);
    error.name = 'ApiError';
    error.isApiError = true;

    if (Number.isFinite(response?.status)) {
      error.status = response.status;
    }

    if (typeof cause !== 'undefined') {
      error.cause = cause;
    }

    return error;
  }

  function normalizeErrorMessage(error, fallbackMessage = 'An unexpected error occurred') {
    const message = typeof error?.message === 'string' && error.message.trim()
      ? error.message.trim()
      : fallbackMessage;

    if (error?.isApiError) {
      return `API error: ${message}`;
    }

    return message;
  }

  const SHARED_STYLES_ID = 'tanvis-shared-styles';
  const SHARED_STYLES = `
.tanvis-controls {
  width: 100%;
  margin-top: 0;
}

.tanvis-controls-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.tanvis-controls-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.5rem;
  border: 1px solid #9ca3af;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1 system-ui, sans-serif;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
}

.tanvis-controls-toggle-label {
  line-height: 1;
}

.tanvis-controls-toggle:hover {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-toggle:focus-visible {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-toggle[aria-expanded="true"] {
  border-color: #6b7280;
  background: #6b7280;
  color: #ffffff;
}

.tanvis-controls-group {
  display: block;
}

.tanvis-controls-group[hidden] {
  display: none;
}

.tanvis-controls-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.tanvis-controls-option {
  position: relative;
  display: inline-flex;
}

.tanvis-controls-option + .tanvis-controls-option {
  margin-left: -1px;
}

.tanvis-controls-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  margin: 0;
  cursor: pointer;
}

.tanvis-controls-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 4.5rem;
  padding: 0.5rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 0;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  text-transform: lowercase;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-input:hover + .tanvis-controls-text {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-input:focus-visible + .tanvis-controls-text {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-input:checked + .tanvis-controls-text {
  border-color: #6b7280;
  background: #6b7280;
  color: #ffffff;
}

.tanvis-controls-input:disabled + .tanvis-controls-text {
  opacity: 0.6;
  cursor: not-allowed;
}

.tanvis-controls-text-input {
  width: 100%;
  min-width: 14rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 0;
  background: #ffffff;
  color: #1f2937;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  box-sizing: border-box;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-text-input:hover {
  border-color: #6b7280;
  background: #f8fafc;
}

.tanvis-controls-text-input:focus-visible {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.tanvis-controls-field {
  display: block;
  margin: 0;
}

.tanvis-controls-field-inline {
  display: inline-flex;
  align-items: stretch;
}

.tanvis-controls-gap-top {
  margin-top: 0.5rem;
}

.tanvis-controls-select {
  min-width: 13rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.9rem;
  border: 1px solid #9ca3af;
  border-radius: 0;
  background: #f8fafc;
  color: #1f2937;
  font: 600 0.95rem/1.2 system-ui, sans-serif;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.tanvis-controls-select:hover {
  border-color: #6b7280;
  background: #f1f5f9;
}

.tanvis-controls-select:focus-visible {
  outline: 0;
  border-color: #6b7280;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.18);
}

.tanvis-controls-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tanvis-controls-help {
  margin: 0.5rem 0 0;
  color: #4b5563;
  font: 500 0.85rem/1.3 system-ui, sans-serif;
}

.tanvis-grid-stats-map-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.tanvis-grid-stats-switch,
.tanvis-grid-stats-map-type-switch {
  margin-top: 0;
}

.tanvis-grid-stats-switch .tanvis-controls-text,
.tanvis-grid-stats-map-type-switch .tanvis-controls-text {
  text-transform: none;
  min-width: 5.25rem;
}

#map-tetrad-info {
  min-height: 1.2em;
  margin: 0 0 0.35rem;
}

#map-tetrad-info.tanvis-map-tetrad-info-empty::before {
  content: attr(data-placeholder);
  color: #9ca3af;
}

.tanvis-species-search-list {
  padding-inline-start: 0;
}

.tanvis-species-search-list {
  margin-top: 0;
}

.tanvis-species-search-item {
  list-style-type: none;
  cursor: pointer;
}

.tanvis-species-search-item div {
  padding: 0.5rem;
}

.tanvis-species-search-result em {
  font-style: italic;
}

.tanvis-species-search-item:nth-child(odd) {
  background-color: #f2f2f2;
}

.tanvis-species-search-item:nth-child(even) {
  background-color: #ffffff;
}

.tanvis-controls-group {
  max-width: max-content;
}

div[data-tanvis-controls="species-selector"] {
  min-width: 20rem;
}

.tanvis[data-vis-type='species-name-block'] {
  font-size: 1.5rem;
}

.tanvis-table-header-text {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.tanvis-help-block-section {
  margin-bottom: 0.75rem;
}

.tanvis-help-block-description {
  margin-bottom: 0.75rem;
  color: #1f2937;
}

.tanvis-help-block-attribute {
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.tanvis-help-block-attribute:last-child {
  border-bottom: none;
}

.tanvis-help-block-attribute-name {
  font-weight: 600;
  font-family: monospace;
}

.tanvis-help-block-attribute-allowed-values,
.tanvis-help-block-attribute-default-value {
  color: #4b5563;
  font-size: 0.9rem;
}

`;

  function ensureSharedStyles() {
    if (typeof document === 'undefined') {
      return;
    }

    if (document.getElementById(SHARED_STYLES_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = SHARED_STYLES_ID;
    style.textContent = SHARED_STYLES;
    document.head.appendChild(style);
  }

  const listenersByControlId = new Map();
  const latestEventByControlId = new Map();

  function subscribeToControl(controlId, handler) {
    if (!controlId || typeof handler !== 'function') {
      return () => {};
    }

    let listeners = listenersByControlId.get(controlId);
    if (!listeners) {
      listeners = new Set();
      listenersByControlId.set(controlId, listeners);
    }

    listeners.add(handler);

    return () => {
      const existing = listenersByControlId.get(controlId);
      if (!existing) {
        return;
      }

      existing.delete(handler);
      if (existing.size === 0) {
        listenersByControlId.delete(controlId);
      }
    };
  }

  function publishControlEvent(controlId, event) {
    if (!controlId) {
      return;
    }

    latestEventByControlId.set(controlId, event);

    const listeners = listenersByControlId.get(controlId);
    if (!listeners) {
      return;
    }

    // Publish to a snapshot so subscribe/unsubscribe during a handler does not
    // mutate the current dispatch cycle and cause re-entrant loops.
    const snapshot = Array.from(listeners);
    snapshot.forEach((handler) => handler(event));
  }

  function getLatestControlEvent(controlId) {
    if (!controlId) {
      return undefined;
    }

    return latestEventByControlId.get(controlId);
  }

  function createControlsPanel(options = {}) {
    ensureSharedStyles();

    const label = options.label || 'Data options';
    const ariaLabel = options.ariaLabel || 'Toggle controls';
    const expanded = options.expanded !== false;
    const showToggle = options.showToggle !== false;

    const panel = document.createElement('div');
    panel.className = 'tanvis-controls';

    const header = document.createElement('div');
    header.className = 'tanvis-controls-header';
    panel.appendChild(header);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tanvis-controls-toggle';
    toggle.setAttribute('aria-label', ariaLabel);
    toggle.setAttribute('aria-expanded', String(expanded));
    header.appendChild(toggle);

    const toggleIcon = document.createElement('span');
    toggleIcon.className = 'tanvis-controls-toggle-icon';
    toggleIcon.setAttribute('aria-hidden', 'true');
    toggleIcon.textContent = '⚙';

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'tanvis-controls-toggle-label';
    toggleLabel.textContent = label;

    toggle.appendChild(toggleIcon);
    toggle.appendChild(toggleLabel);
    if (!showToggle) {
      toggle.style.display = 'none';
    }

    const body = document.createElement('div');
    body.className = 'tanvis-controls-group';
    body.hidden = !expanded;
    panel.appendChild(body);

    toggle.addEventListener('click', () => {
      const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !isExpanded;
      toggle.setAttribute('aria-expanded', String(nextExpanded));
      body.hidden = !nextExpanded;
    });

    return { panel, body, toggle };
  }

  function createRadioGroup(options) {
    const group = document.createElement('div');
    group.className = options.groupClassName || 'tanvis-controls-options';

    for (const option of options.items || []) {
      const label = document.createElement('label');
      label.className = options.optionClassName || 'tanvis-controls-option';

      const input = document.createElement('input');
      input.className = options.inputClassName || 'tanvis-controls-input';
      input.type = 'radio';
      input.name = options.name;
      input.value = option.value;
      input.checked = options.selectedValue === option.value;
      input.addEventListener('change', () => {
        if (!input.checked || typeof options.onChange !== 'function') {
          return;
        }

        options.onChange(option.value);
      });

      const text = document.createElement('span');
      text.className = options.textClassName || 'tanvis-controls-text';
      text.textContent = option.label;

      label.appendChild(input);
      label.appendChild(text);
      group.appendChild(label);
    }

    return group;
  }

  function normalizeAreaContractValue(value) {
    if (value === '' || value === undefined || value === null) {
      return '';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === 'vc-all' || trimmed === 'all') {
        return '';
      }

      if (/^vc-\d+$/.test(trimmed)) {
        return Number.parseInt(trimmed.substring(3), 10);
      }

      if (/^\d+$/.test(trimmed)) {
        return Number.parseInt(trimmed, 10);
      }
    }

    return value;
  }

  function normalizeAreaSelectionValue(value) {
    const normalized = normalizeAreaContractValue(value);
    if (normalized === '') {
      return '';
    }

    return String(normalized);
  }

  const areaOptions = [
    { label: 'vc58', value: '58' },
    { label: 'vc59', value: '59' },
    { label: 'vc60', value: '60' },
    { label: 'all', value: '' }
  ];

  function createAreaControls({ element, selectedValue, onAreaChange, body }) {
    const targetBody = body || createControlsPanel({
      label: 'Data options',
      ariaLabel: 'Toggle map controls'
    }).body;

    if (body) {
      body.dataset.tanvisControls = 'area';
    }

    const groupName = element?.id ? `${element.id}-area` : 'tanvis-control-block-area';
    const group = createRadioGroup({
      name: groupName,
      selectedValue: normalizeAreaSelectionValue(selectedValue),
      items: areaOptions,
      onChange: (value) => {
        const normalizedArea = normalizeAreaContractValue(value);

        if (element?.dataset) {
          element.dataset.visArea = normalizedArea === '' ? '' : String(normalizedArea);
        }

        if (typeof onAreaChange === 'function') {
          onAreaChange(normalizedArea);
        }
      }
    });

    targetBody.appendChild(group);

    return targetBody;
  }

  const transOptsSel = {
    // Different views for the three VCs in the Cheshire/Lancashire area
    // and a combined view for all of them together.
    'vc-all': {
      id: 'vc-all',
      caption: 'Cheshire Lancashire VCs',
      initZoom: 8,
      bounds: {
        xmin: 302500,
        ymin: 325000,
        xmax: 425000,
        ymax: 495000
      },
      centroid: {
        lat: 53.585317,
        lon: -2.549048
      }
    },
    'vc-58': {
      id: 'vc-58',
      caption: 'Cheshire (58)',
      initZoom: 9,
      bounds: {
        xmin: 305000,
        ymin: 325000,
        xmax: 425000,
        ymax: 415000
      },
      centroid: {
        lat: 53.225875,
        lon: -2.525714
      }
    },
    'vc-59': {
      id: 'vc-59',
      caption: 'South Lancashire (59)',
      initZoom: 9,
      bounds: {
        xmin: 315000,
        ymin: 375000,
        xmax: 405000,
        ymax: 455000
      },
      centroid: {
        lat: 53.629982,
        lon: -2.606334
      }
    },
    'vc-60': {
      id: 'vc-60',
      caption: 'West Lancashire (60)',
      initZoom: 9,
      bounds: {
        xmin: 315000,
        ymin: 415000,
        xmax: 385000,
        ymax: 495000
      },
      centroid: {
        lat: 53.988606,
        lon: -2.764047
      }
    }
  };

  const elementIdCounters = new Map();

  function assignElementId(element, prefix) {
    if (element?.id) {
      return element.id;
    }

    const current = elementIdCounters.get(prefix) || 0;
    const next = current + 1;
    elementIdCounters.set(prefix, next);
    element.id = `${prefix}-${next}`;
    return element.id;
  }

  function clearControlSubscription$6(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function clearExpandResizeHandlers(element) {
    const cleanup = element?.__tanvisExpandCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisExpandCleanup;
  }

  function getEffectiveArea$6(config) {
    if (!config.control) {
      return normalizeAreaContractValue(config.area);
    }

    if (typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  function subscribeToAreaControl(controlId, handler) {
    return subscribeToControl(controlId, (event) => {
      if (!event || event.type !== 'area-change' || event.area === undefined || event.area === null) {
        return;
      }

      handler(event.area, event);
    });
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

  function calculateHeightFromBounds(width, bounds) {
    if (width === undefined || !bounds) {
      return undefined;
    }

    const boxWidth = bounds.xmax - bounds.xmin;
    const boxHeight = bounds.ymax - bounds.ymin;
    if (boxWidth <= 0 || boxHeight <= 0) {
      return undefined;
    }

    return Math.round(width * (boxHeight / boxWidth));
  }

  function getConfiguredWidth(element, config) {
    const configuredWidth = parseOptionalPositiveNumber(config.width);

    if (config.expand !== true) {
      return configuredWidth;
    }

    return getParentWidth(element) ?? configuredWidth;
  }

  function getParentWidth(element) {
    return parseOptionalPositiveNumber(element?.parentElement?.clientWidth);
  }

  function attachExpandResizeHandlers(element, config, map, onResize) {
    const resizeAction = () => {
          resizeExpandedMap(element, config, map);
        };

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined' && element.parentElement) {
      resizeObserver = new ResizeObserver(resizeAction);
      resizeObserver.observe(element.parentElement);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', resizeAction);
    }

    element.__tanvisExpandCleanup = () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', resizeAction);
      }
    };
  }

  function resizeExpandedMap(element, config, map) {
    if (!map || typeof map.setSize !== 'function') {
      return;
    }

    const width = getParentWidth(element);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const bounds = getAreaBounds(config.area);
    const height = explicitHeight ?? calculateHeightFromBounds(width, bounds);

    if (width === undefined || height === undefined) {
      return;
    }

    map.setSize(width, height);

    if (typeof map.invalidateSize === 'function') {
      map.invalidateSize();
    }
  }

  function resolveAreaSelectionKey(area) {
    if (area === '') {
      return 'vc-all';
    }

    return `vc-${area}`;
  }

  function getAreaBounds(area) {
    return transOptsSel[resolveAreaSelectionKey(area)]?.bounds;
  }

  function getAreaCentroid(area) {
    return transOptsSel[resolveAreaSelectionKey(area)]?.centroid;
  }

  function getAreaInitZoom(area) {
    return transOptsSel[resolveAreaSelectionKey(area)]?.initZoom ?? 10;
  }

  function getBrcAtlasGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brcatlas || null;
  }

  function renderStaticAtlasMap(element, config, options = {}) {
    clearExpandResizeHandlers(element);
    clearControlSubscription$6(element);

    const status = createVisStatusReporter(element);
    clearElement(element);
    status.showInfo('Loading...');

    try {
      const brcAtlas = getBrcAtlasGlobal();

      if (!brcAtlas || typeof brcAtlas.svgMap !== 'function') {
        throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
      }

      const hasStylesheet = ensureStylesheetDependency(status, {
        libraryName: 'BRC Atlas',
        stylesheetHints: ['brcatlas.umd.css'],
        message: 'BRC Atlas stylesheet is missing. Include brcatlas.umd.css to ensure the static map is styled correctly.'
      });

      const idPrefix = options.idPrefix || 'tanvis-map';
      assignElementId(element, idPrefix);
      ensureMapTetradInfo$1(element);

      const effectiveArea = getEffectiveArea$6(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };

      element.dataset.visArea = renderConfig.area;

      //console.log('config', createStaticMapOptions(element, renderConfig, options));
      console.log('rendering static map for area:', renderConfig.area);
      const map = brcAtlas.svgMap(createStaticMapOptions(element, renderConfig, options));
      const instanceId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      map.__tanvisMapInstanceId = instanceId;
      map.__tanvisMapArea = renderConfig.area;
      map.__tanvisMapElementId = element.id;
      console.log('[species-map] created static map instance', {
        instanceId,
        area: renderConfig.area,
        elementId: element.id
      });
      // pause execution to allow the map to render before continuing (for testing purposes)

      //await new Promise(resolve => setTimeout(resolve, 1000));

      if (map && typeof map.redrawMap === 'function') {
        console.log('[species-map] redraw static map instance', {
          instanceId,
          area: renderConfig.area,
          elementId: element.id
        });
        map.redrawMap();
      }

      if (renderConfig.control && options.subscribeToAreaControl !== false) {
        element.__tanvisControlCleanup = subscribeToAreaControl(renderConfig.control, (area) => {
          if (area === element.dataset.visArea) {
            return;
          }

          element.dataset.visArea = area;
          renderStaticAtlasMap(element, {
            ...renderConfig,
            area
          }, options);
        });
      }

      if (hasStylesheet) {
        status.clear();
      }
      return map;
    } catch (error) {
      clearElement(element);
      status.showError(normalizeErrorMessage(error, options.errorMessage || 'Failed to render static map'));
      return null;
    }
  }

  function createStaticMapOptions(element, config, options) {
    const includeHectads = config.hectads !== false;
    const shouldExpand = config.expand === true;
    const width = parseOptionalPositiveNumber(config.width);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const selectedBounds = getAreaBounds(config.area);
    const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);

    const areaSelectionKey = resolveAreaSelectionKey(config.area);

    return {
      selector: `#${element.id}`,
      captionId: 'map-tetrad-info',
      transOptsControl: false,
      transOptsSel,
      transOptsKey: areaSelectionKey,
      boundaryGjson: `/data/vcs/simp-100/${areaSelectionKey}-100.geojson`,
      ...(height !== undefined ? { height } : {}),
      ...(shouldExpand ? { expand: true } : {}),
      ...(includeHectads
        ? { gridGjson: `/data/vcs/hectad-grids/${areaSelectionKey}-hectads.geojson` }
        : { gridLineStyle: 'none' }),
      mapTypesSel: options.mapTypesSel,
      mapTypesKey: options.mapTypesKey,
    };
  }

  function ensureMapTetradInfo$1(element) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();

    const parent = element?.parentElement;
    if (!parent) {
      return;
    }

    let info = document.getElementById('map-tetrad-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'map-tetrad-info';
    }

    info.setAttribute('data-placeholder', 'Tetrad information');
    ensureMapTetradInfoPlaceholderBehavior$1(info);
    parent.insertBefore(info, element);
  }

  function ensureMapTetradInfoPlaceholderBehavior$1(info) {
    if (!info) {
      return;
    }

    if (!info.__tanvisMapTetradInfoObserver) {
      const observer = new MutationObserver(() => {
        syncMapTetradInfoEmptyState$1(info);
      });

      observer.observe(info, {
        childList: true,
        subtree: true,
        characterData: true
      });

      info.__tanvisMapTetradInfoObserver = observer;
    }

    syncMapTetradInfoEmptyState$1(info);
  }

  function syncMapTetradInfoEmptyState$1(info) {
    const isEmpty = !String(info.textContent || '').trim();
    info.classList.toggle('tanvis-map-tetrad-info-empty', isEmpty);
  }

  function renderLeafletAtlasMap(element, config, options = {}) {
    clearExpandResizeHandlers(element);
    clearControlSubscription$6(element);

    const status = createVisStatusReporter(element);
    clearElement(element);
    status.showInfo('Loading...');

    try {
      const brcAtlas = getBrcAtlasGlobal();

      if (!brcAtlas || typeof brcAtlas.leafletMap !== 'function') {
        throw new Error('BRC Atlas is not available. Include brcatlas.umd.js before Tanvis.');
      }

      if (typeof window === 'undefined' || typeof window.L === 'undefined') {
        throw new Error('Leaflet is not available. Include leaflet.js before using the Tanvis Leaflet mapping.');
      }

      const hasStylesheet = ensureStylesheetDependency(status, {
        libraryName: 'Leaflet',
        stylesheetHints: ['leaflet.css'],
        message: 'Leaflet stylesheet is missing. Include leaflet.css to ensure the map is styled correctly.'
      });

      const idPrefix = options.idPrefix || 'tanvis-leaflet-map';
      assignElementId(element, idPrefix);
      ensureMapTetradInfo(element);

      const effectiveArea = getEffectiveArea$6(config);
      const renderConfig = effectiveArea === config.area
        ? config
        : {
            ...config,
            area: effectiveArea
          };

      element.dataset.visArea = renderConfig.area;

      const map = brcAtlas.leafletMap(createLeafletMapOptions(element, renderConfig, options));

      if (renderConfig.expand === true) {
        attachExpandResizeHandlers(element, renderConfig, map);
      }

      panToAreaCentroid(renderConfig.area, map);


      if (map && typeof map.redrawMap === 'function') {
        map.redrawMap();
      }

      if (renderConfig.control) {
        element.__tanvisControlCleanup = subscribeToAreaControl(renderConfig.control, (area) => {
          if (area === element.dataset.visArea) {
            return;
          }

          element.dataset.visArea = area;
          panToAreaCentroid(area, map);
        });
      }

      if (hasStylesheet) {
        status.clear();
      }
      return map;
    } catch (error) {
      clearElement(element);
      status.showError(normalizeErrorMessage(error, options.errorMessage || 'Failed to render slippy map'));
      return null;
    }
  }

  function createLeafletMapOptions(element, config, options) {
    const width = getConfiguredWidth(element, config);
    const explicitHeight = parseOptionalPositiveNumber(config.height);
    const selectedBounds = getAreaBounds(config.area);
    const height = explicitHeight ?? calculateHeightFromBounds(width, selectedBounds);
    const showBoundaries = config.boundaries === true;

    return {
      selector: `#${element.id}`,
      captionId: 'map-tetrad-info',
      showVcs: showBoundaries,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
      ...(options?.mapTypesSel ? { mapTypesSel: options.mapTypesSel } : {}),
      ...(options?.mapTypesKey ? { mapTypesKey: options.mapTypesKey } : {}),
      basemapConfigs: [
        {
          name: 'OpenStreetMap',
          type: 'tileLayer',
          selected: true,
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          opts: {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
        },
        {
          name: 'OpenTopoMap',
          type: 'tileLayer',
          selected: false,
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          opts: {
            maxZoom: 17,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          }
        }
      ]
    };
  }

  function ensureMapTetradInfo(element) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();

    const parent = element?.parentElement;
    if (!parent) {
      return;
    }

    let info = document.getElementById('map-tetrad-info');
    if (!info) {
      info = document.createElement('div');
      info.id = 'map-tetrad-info';
    }

    info.setAttribute('data-placeholder', 'Tetrad information');
    ensureMapTetradInfoPlaceholderBehavior(info);
    parent.insertBefore(info, element);
  }

  function ensureMapTetradInfoPlaceholderBehavior(info) {
    if (!info) {
      return;
    }

    if (!info.__tanvisMapTetradInfoObserver) {
      const observer = new MutationObserver(() => {
        syncMapTetradInfoEmptyState(info);
      });

      observer.observe(info, {
        childList: true,
        subtree: true,
        characterData: true
      });

      info.__tanvisMapTetradInfoObserver = observer;
    }

    syncMapTetradInfoEmptyState(info);
  }

  function syncMapTetradInfoEmptyState(info) {
    const isEmpty = !String(info.textContent || '').trim();
    info.classList.toggle('tanvis-map-tetrad-info-empty', isEmpty);
  }

  function panToAreaCentroid(areaKey, map) {
    const centroid = getAreaCentroid(areaKey);
    const zoom = getAreaInitZoom(areaKey);
    const leafletMap = map?.lmap;

    if (!centroid || !leafletMap || typeof leafletMap.setView !== 'function') {
      return;
    }

    leafletMap.setView([centroid.lat, centroid.lon], zoom);
  }

  function logApiRequest(url, options = {}) {
    const method = (options?.method || 'GET').toUpperCase();
    console.info(`[api-request] ${method} ${url}`);
  }

  function normalizeNamePart(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  function parseTaxonGroupDisplayNames(group) {
    const title = normalizeNamePart(group?.title);
    const friendly = normalizeNamePart(group?.friendly);

    if (friendly) {
      return {
        scientificName: title,
        vernacularName: friendly
      };
    }

    const match = title.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      const [, before, inside] = match;
      return {
        scientificName: normalizeNamePart(inside),
        vernacularName: normalizeNamePart(before)
      };
    }

    return {
      scientificName: title,
      vernacularName: title
    };
  }

  const LABEL_MODE_OPTIONS = [
    { label: 'Scientific', value: 'scientific' },
    { label: 'Vernacular', value: 'vernacular' }
  ];

  function createLanguageControls({ rootElement, body, state, onChange }) {
    if (!body) {
      return null;
    }

    const labelModeField = document.createElement('div');
    labelModeField.className = 'tanvis-controls-field tanvis-controls-gap-top';
    body.appendChild(labelModeField);

    const radioGroup = createRadioGroup({
      name: `${rootElement?.id || 'tanvis'}-taxon-group-label-mode`,
      selectedValue: state.labelMode,
      items: LABEL_MODE_OPTIONS,
      onChange: (value) => {
        state.labelMode = value;
        if (typeof onChange === 'function') {
          onChange(value);
        }
      }
    });

    labelModeField.appendChild(radioGroup);
    return labelModeField;
  }

  function createTaxonGroupControls({ rootElement, apiBase, selectedValue = '', labelMode = 'scientific', loadToken, body, showSelector = true, showLabelMode = true }) {
    const initialGroupIdFromDataset = rootElement?.dataset?.visGroupid || '';
    const initialSelectedValue = selectedValue || initialGroupIdFromDataset || rootElement?.dataset?.visTaxonGroup || '';
    const initialLabelMode = rootElement?.dataset?.visTaxonGroupLabelMode || rootElement?.dataset?.visLanguage || labelMode || 'scientific';

    const targetBody = body || createControlsPanel({
      label: 'Taxon groups',
      ariaLabel: 'Toggle taxon group controls'
    }).body;

    if (body) {
      body.dataset.tanvisControls = 'taxon-groups';
    }

    const state = {
      groups: [],
      selectedValue: initialSelectedValue,
      labelMode: initialLabelMode
    };

    syncRootDataset();

    let selectField = null;
    let select = null;

    if (showSelector) {
      selectField = document.createElement('label');
      selectField.className = 'tanvis-controls-field tanvis-controls-gap-top';

      select = document.createElement('select');
      select.className = 'tanvis-controls-select';
      select.disabled = true;
      select.value = state.selectedValue;

      select.addEventListener('change', () => {
        state.selectedValue = select.value;
        syncRootDataset();
        publishTaxonGroupChange();
      });

      selectField.appendChild(select);
      targetBody.appendChild(selectField);
    }

    const status = createVisStatusReporter(targetBody);
    status.showInfo('Loading taxon groups...');

    if (showLabelMode) {
      createLanguageControls({
        rootElement,
        body: targetBody,
        state,
        onChange: (value) => {
          state.labelMode = value;
          syncRootDataset();
          renderOptions();
          publishLanguageChange();
        }
      });
    }

    renderOptions();

    fetchTaxonGroups(apiBase)
      .then((groups) => {
        if (!isCurrentLoad()) {
          return;
        }

        state.groups = groups;
        status.clear();
        if (select) {
          select.disabled = false;
        }
        renderOptions();
      })
      .catch((error) => {
        if (!isCurrentLoad()) {
          return;
        }

        state.groups = [];
        state.selectedValue = '';
        status.showError(`${normalizeErrorMessage(error, 'Unable to load taxon groups')}. Showing All groups only.`);
        if (select) {
          select.disabled = false;
        }
        renderOptions();
      });

    return targetBody;

    function renderOptions() {
      if (!select) {
        syncRootDataset();
        return;
      }

      const currentSelectedValue = state.selectedValue;
      select.innerHTML = '';

      const allOption = document.createElement('option');
      allOption.value = '';
      allOption.textContent = 'All groups';
      select.appendChild(allOption);

      for (const group of state.groups) {
        const option = document.createElement('option');
        option.value = group.external_key;
        const parsedNames = parseTaxonGroupDisplayNames(group);
        const displayName = state.labelMode === 'vernacular'
          ? (parsedNames.vernacularName || parsedNames.scientificName || group.external_key)
          : (parsedNames.scientificName || parsedNames.vernacularName || group.external_key);
        option.textContent = displayName;
        select.appendChild(option);
      }

      if (state.groups.length > 0 && !state.groups.some((group) => group.external_key === currentSelectedValue)) {
        state.selectedValue = '';
        select.value = '';
      } else {
        select.value = currentSelectedValue;
      }

      syncRootDataset();
    }

    function syncRootDataset() {
      if (!rootElement?.dataset) {
        return;
      }

      rootElement.dataset.visTaxonGroup = state.selectedValue;
      rootElement.dataset.visTaxonGroupLabelMode = state.labelMode;
      rootElement.dataset.visLanguage = state.labelMode;
      rootElement.dataset.visTaxonGroupNameMode = state.labelMode;
    }

    function publishTaxonGroupChange() {
      if (!rootElement?.id) {
        return;
      }

      publishControlEvent(rootElement.id, {
        type: 'taxon-group-change',
        taxonGroup: state.selectedValue
      });
    }

    function publishLanguageChange() {
      if (!rootElement?.id) {
        return;
      }

      publishControlEvent(rootElement.id, {
        type: 'language-change',
        labelMode: state.labelMode
      });
    }

    function isCurrentLoad() {
      if (!rootElement) {
        return true;
      }

      return rootElement.__tanvisControlBlockLoadToken === loadToken;
    }
  }

  async function fetchTaxonGroups(apiBase) {
    const resourceUrl = resolveResourceUrl$8(apiBase, 'taxon-groups');
    const payload = await fetchJson$a(resourceUrl.toString(), 'Failed to load taxon groups');
    return getListData$7(payload);
  }

  function resolveResourceUrl$8(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$a(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$7(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  const SPECIES_SEARCH_DEBOUNCE_MS = 300;
  const SPECIES_SEARCH_LIMIT = 10;

  function createSpeciesSearchControls({ rootElement, apiBase, body, loadToken }) {
    if (!body) {
      return null;
    }

    const panel = document.createElement('div');
    panel.className = 'tanvis-controls-field tanvis-controls-gap-top';
    panel.dataset.tanvisControls = 'species-selector';

    const searchMode = rootElement?.dataset?.visTaxonGroupLabelMode === 'vernacular' ? 'vernacular' : 'scientific';
    const label = document.createElement('label');
    label.className = 'tanvis-controls-label';

    const input = document.createElement('input');
    input.className = 'tanvis-controls-text-input tanvis-species-search-input';
    input.type = 'text';
    input.placeholder = getSearchPlaceholder(searchMode);
    input.autocomplete = 'off';

    const results = document.createElement('div');
    results.className = 'tanvis-species-search-results';

    const status = createVisStatusReporter(panel);
    const searchState = {
      query: '',
      searchMode,
      activeRequestToken: 0
    };

    label.appendChild(input);
    panel.appendChild(label);
    panel.appendChild(results);
    body.appendChild(panel);

    let debounceTimer = null;

    input.addEventListener('input', () => {
      const nextQuery = input.value.trim();
      searchState.query = nextQuery;
      status.clear();

      if (!nextQuery) {
        clearResults();
        searchState.activeRequestToken += 1;
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        queueSearch(nextQuery);
      }, SPECIES_SEARCH_DEBOUNCE_MS);
    });

    const syncSearchModeFromRoot = () => {
      const nextMode = rootElement?.dataset?.visTaxonGroupLabelMode === 'vernacular' ? 'vernacular' : 'scientific';
      if (searchState.searchMode !== nextMode) {
        searchState.searchMode = nextMode;
        input.placeholder = getSearchPlaceholder(nextMode);
        if (searchState.query.trim()) {
          queueSearch(searchState.query);
        }
      }
    };

    if (rootElement) {
      rootElement.addEventListener('change', syncSearchModeFromRoot);
    }

    function queueSearch(query) {
      const currentRequestToken = ++searchState.activeRequestToken;
      const searchField = searchState.searchMode === 'vernacular' ? 'vernacular_name' : 'scientific_name';
      const taxonGroupExternalKey = rootElement?.dataset?.visTaxonGroup || '';

      fetchSuggestedTaxa({
        apiBase,
        query,
        searchField,
        taxonGroupExternalKey
      }).then((taxa) => {
        if (!isCurrentLoad() || searchState.activeRequestToken !== currentRequestToken) {
          return;
        }

        renderResults(taxa);
      }).catch((error) => {
        if (!isCurrentLoad() || searchState.activeRequestToken !== currentRequestToken) {
          return;
        }

        status.showError(normalizeErrorMessage(error, 'Unable to search species'));
        clearResults();
      });
    }

    function renderResults(taxa) {
      clearResults();

      if (!Array.isArray(taxa) || taxa.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'tanvis-species-search-empty';
        emptyState.textContent = '';
        results.appendChild(emptyState);
        return;
      }

      const list = document.createElement('ul');
      list.className = 'tanvis-species-search-list';

      taxa.slice(0, SPECIES_SEARCH_LIMIT).forEach((taxon) => {
        const item = document.createElement('li');
        item.className = 'tanvis-species-search-item';

        const option = document.createElement('div');
        option.className = 'tanvis-species-search-result';
        option.innerHTML = formatTaxonLabel(taxon);
        option.tabIndex = 0;
        option.role = 'button';
        option.addEventListener('click', () => {
          const speciesId = taxon.taxon_identifier || taxon.identifier || taxon.id || '';
          if (!speciesId) {
            return;
          }

          input.value = '';
          searchState.query = '';
          clearResults();
          searchState.activeRequestToken += 1;
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }
          status.clear();

          const event = new CustomEvent('taxon-identified', {
            detail: { speciesId },
            bubbles: true,
            cancelable: true
          });

          rootElement?.dispatchEvent?.(event);
        });
        option.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            option.click();
          }
        });

        item.appendChild(option);
        list.appendChild(item);
      });

      results.appendChild(list);
    }

    function clearResults() {
      results.innerHTML = '';
    }

    function formatTaxonLabel(taxon) {
      const scientificName = taxon.scientific_name || taxon.scientificName || '';
      const vernacularName = taxon.vernacular_name || taxon.vernacularName || '';
      if (searchState.searchMode === 'vernacular' && vernacularName) {
        return `${vernacularName}${scientificName ? ` <em>(${escapeHtml(scientificName)})</em>` : ''}`;
      }

      if (scientificName) {
        return `<em>${escapeHtml(scientificName)}</em>`;
      }

      return escapeHtml(vernacularName || taxon.taxon_identifier || taxon.identifier || taxon.id || 'Unknown species');
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function getSearchPlaceholder(mode) {
      return mode === 'vernacular'
        ? 'Type vernacular name...'
        : 'Type scientific name...';
    }

    function isCurrentLoad() {
      if (!rootElement) {
        return true;
      }

      return rootElement.__tanvisControlBlockLoadToken === loadToken;
    }

    return panel;
  }

  async function fetchSuggestedTaxa({ apiBase, query, searchField, taxonGroupExternalKey }) {
    if (!query) {
      return [];
    }

    const resourceUrl = resolveResourceUrl$7(apiBase, 'taxa');
    const url = new URL(resourceUrl.toString());
    url.searchParams.set(`${searchField}[contains]`, query);
    if (taxonGroupExternalKey) {
      url.searchParams.set('include', 'taxon-group');
      url.searchParams.set('taxon_group__external_key', taxonGroupExternalKey);
    }
    url.searchParams.set('limit', String(SPECIES_SEARCH_LIMIT));

    const payload = await fetchJson$9(url.toString(), 'Failed to search taxa');
    return getListData$6(payload);
  }

  function resolveResourceUrl$7(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$9(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$6(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  const DEFAULT_API_BASE = 'https://tanhub.biodiverseit.co.uk/api/v1';

  function resolveApiBase() {
    return DEFAULT_API_BASE;
  }

  const CONTROL_ELEMENT_TOKENS = new Set(['area', 'groups', 'language', 'species']);

  function createControlBlockAdapter() {
    return {
      name: 'control-block',
      render(element, config) {

        const loadToken = (element.__tanvisControlBlockLoadToken || 0) + 1;
        element.__tanvisControlBlockLoadToken = loadToken;

        clearElement(element);

        const visibleControls = parseVisibleControls(config.controlElements ?? element?.dataset?.visControlElements);

        const { panel, body } = createControlsPanel({
          label: 'Data options',
          ariaLabel: 'Toggle data controls',
          expanded: config.showDataOptsExpanded === true,
          showToggle: config.showDataOptsToggle !== false
        });
        panel.dataset.tanvisControls = 'data-options';
        element.appendChild(panel);

        if (visibleControls.has('area')) {
          createAreaControls({
            element,
            selectedValue: config.area,
            body,
            onAreaChange: (value) => {
              publishControlEvent(element.id, {
                type: 'area-change',
                area: normalizeAreaContractValue(value)
              });
            }
          });
        }

        if (visibleControls.has('groups') || visibleControls.has('language')) {
         
          createTaxonGroupControls({
            rootElement: element,
            apiBase: resolveApiBase(),
            selectedValue: config.groupId || '',
            labelMode: config.language || 'scientific',
            body,
            loadToken,
            showSelector: visibleControls.has('groups'),
            showLabelMode: visibleControls.has('language')
          });
        }

        if (visibleControls.has('species')) {
          createSpeciesSearchControls({
            rootElement: element,
            apiBase: resolveApiBase(),
            body,
            loadToken
          });
        }

        if (visibleControls.has('area')) {
          publishControlEvent(element.id, {
            type: 'area-change',
            area: normalizeAreaContractValue(config.area)
          });
        }
      }
    };
  }

  function parseVisibleControls(value) {
    if (typeof value !== 'string') {
      return new Set(['area', 'groups', 'language', 'species']);
    }

    const controls = value.split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => CONTROL_ELEMENT_TOKENS.has(token));

    return new Set(controls.length > 0 ? controls : ['area', 'groups', 'language', 'species']);
  }

  const controlBlockAdapter = createControlBlockAdapter();

  function renderControlBlock(element, config) {
    controlBlockAdapter.render(element, config);
  }

  function createSpeciesIdentifierAdapter() {
    return {
      name: 'species-identifier',
      render(element, config) {
        clearElement(element);

        const loadToken = (element.__tanvisSpeciesIdentifierLoadToken || 0) + 1;
        element.__tanvisSpeciesIdentifierLoadToken = loadToken;

        const cleanup = element.__tanvisSpeciesIdentifierLoadCleanup;
        if (typeof cleanup === 'function') {
          cleanup();
        }
        delete element.__tanvisSpeciesIdentifierLoadCleanup;

        const speciesId = resolveSelectedSpeciesId(config);
        if (!speciesId) {
          return;
        }

        const emitSelection = () => {
          if (element.__tanvisSpeciesIdentifierLoadToken !== loadToken) {
            return;
          }

          const event = new CustomEvent('taxon-identified', {
            detail: { speciesId },
            bubbles: true,
            cancelable: true
          });

          element.dispatchEvent(event);
        };

        if (document.readyState === 'complete') {
          setTimeout(emitSelection, 0);
          return;
        }

        const onWindowLoad = () => {
          emitSelection();
        };

        window.addEventListener('load', onWindowLoad, { once: true });
        element.__tanvisSpeciesIdentifierLoadCleanup = () => {
          window.removeEventListener('load', onWindowLoad);
        };
      }
    };
  }

  function resolveSelectedSpeciesId(config) {
    const queryTaxonId = getTaxonIdFromQuery();
    if (queryTaxonId !== undefined) {
      return normalizeSpeciesId(queryTaxonId);
    }

    return normalizeSpeciesId(config?.taxonId);
  }

  function getTaxonIdFromQuery() {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const params = new URLSearchParams(window.location.search || '');
    if (!params.has('taxon-id')) {
      return undefined;
    }

    return params.get('taxon-id');
  }

  function normalizeSpeciesId(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  const speciesIdentifierAdapter = createSpeciesIdentifierAdapter();

  function renderSpeciesIdentifier(element, config) {
    speciesIdentifierAdapter.render(element, config);
  }

  const TAXON_STATS_RESOURCE$3 = 'taxon-stats';
  const DEFAULT_PAGE_SIZE$2 = 10;
  const columns$2 = [
    { title: 'Scientific', field: 'scientificName', formatter: 'html', headerSort: false },
    { title: 'Vernacular', field: 'commonName', headerSort: false , responsive: 8 },
    { title: 'Verified', field: 'verifiedStatus', headerSort: false, 
      formatter: "tickCross", hozAlign: "center", formatterParams: {
        allowTruthy: true,     // Allows any non-empty/truthy value to show a tick
        crossElement: false,   // Disables the red cross symbol entirely
        allowEmpty: true       // Keeps empty strings, null, and undefined blank
      }
    },
    { title: 'First record', field: 'firstRecordDate', headerSort: false  },
    { title: 'Group', field: 'taxonGroup', headerSort: false , responsive: 9 },
    { title: 'TVK', field: 'speciesId', headerSort: false , responsive: 10 },
  ];

  function createNewSpeciesTableAdapter() {
    return {
      name: 'new-species-table',
      render(element, config) {
        clearControlSubscription$5(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$5(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const startDate = renderConfig.startDate;
        const endDate = renderConfig.endDate || getCurrentIsoDate();
        const apiBase = resolveApiBase();
        const higherGeographyIdentifier = areaToHigherGeographyIdentifier$2(renderConfig.area);
        const taxonGroupExternalKey = getEffectiveTaxonGroup$3(renderConfig);
        const effectiveLabelMode = getEffectiveLabelMode$2(renderConfig);
        const loadId = (element.__tanvisNewSpeciesLoadId || 0) + 1;
        element.__tanvisNewSpeciesLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;
        element.dataset.visTaxonGroupLabelMode = effectiveLabelMode;
        const pageSize = getConfiguredPageSize$2(renderConfig);

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event) {
              return;
            }

            if (event.type === 'area-change' || event.type === 'taxon-group-change') {
              const nextArea = getEffectiveArea$5(renderConfig);
              const nextTaxonGroupExternalKey = getEffectiveTaxonGroup$3(renderConfig);

              if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
                return;
              }

              element.dataset.visArea = nextArea === '' ? '' : String(nextArea);
              element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
              createNewSpeciesTableAdapter().render(element, {
                ...renderConfig,
                area: nextArea
              });
              return;
            }

            if (event.type === 'language-change') {
              const nextLabelMode = getEffectiveLabelMode$2(renderConfig, event.labelMode);
              if (nextLabelMode === element.dataset.visTaxonGroupLabelMode) {
                return;
              }

              element.dataset.visTaxonGroupLabelMode = nextLabelMode;
              rerenderTableRows$2(element, { labelMode: nextLabelMode });
              refreshSummary$2(element, nextLabelMode);
            }
          });
        }

        const Tabulator = getTabulatorGlobal$2();

        if (!Tabulator) {
          clearElement(element);
          status.showError('Tabulator is not available. Include the Tabulator script before Tanvis.');
          return;
        }

        clearElement(element);
        const summary = createSummary$2(startDate, endDate, 0, renderConfig.area);
        element.appendChild(summary);
        element.__tanvisSummaryElement = summary;
        element.__tanvisSummaryState = { startDate, endDate, area: renderConfig.area, count: 0, taxonGroupInfo: null };

        if (taxonGroupExternalKey) {
          resolveTaxonGroupInfo$2(apiBase, taxonGroupExternalKey).then((taxonGroupInfo) => {
            if (element.__tanvisNewSpeciesLoadId !== loadId || !element.__tanvisSummaryState) {
              return;
            }

            element.__tanvisSummaryState.taxonGroupInfo = taxonGroupInfo;
            refreshSummary$2(element, getEffectiveLabelModeForElement$2(element, renderConfig));
          });
        }

        createTableContainer$2({
          Tabulator,
          pageSize,
          requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
            const labelModeForRequest = getEffectiveLabelModeForElement$2(element, renderConfig);
            const pageResult = await buildNewSpeciesRecordsPage({
              apiBase,
              startDate,
              endDate,
              higherGeographyIdentifier,
              taxonGroupExternalKey,
              pageNumber,
              pageSize: requestedPageSize,
              labelMode: labelModeForRequest
            });

            if (element.__tanvisNewSpeciesLoadId !== loadId) {
              return {
                data: [],
                last_page: 1,
                last_row: 0
              };
            }

            element.__tanvisSummaryState.startDate = startDate;
            element.__tanvisSummaryState.endDate = endDate;
            element.__tanvisSummaryState.area = renderConfig.area;
            element.__tanvisSummaryState.count = pageResult.totalRows;
            refreshSummary$2(element, labelModeForRequest);
            element.__tanvisLatestRows = pageResult.records;
            return {
              data: pageResult.records,
              last_page: pageResult.totalPages,
              last_row: pageResult.totalRows
            };
          },
          element,
          loadId,
          status
        });

        const hasStylesheet = ensureStylesheetDependency(status, {
          libraryName: 'Tabulator',
          stylesheetHints: ['tabulator.min.css'],
          message: 'Tabulator stylesheet is missing. Include tabulator.min.css to ensure the table is styled correctly.'
        });

        if (hasStylesheet) {
          status.clear();
        }

      }
    };
  }

  function rerenderTableRows$2(element, { labelMode }) {
    const tableContainer = element?.querySelector('[data-tanvis-table-container="true"]');
    if (!tableContainer?.__tanvisTable) {
      return;
    }

    const table = tableContainer.__tanvisTable;
    const tableRows = typeof table?.getData === 'function' ? table.getData() : null;
    const rows = Array.isArray(tableRows) && tableRows.length > 0
      ? tableRows
      : (Array.isArray(element.__tanvisLatestRows)
        ? element.__tanvisLatestRows
        : []);

    const remappedRows = rows.map((row) => ({
      ...row,
      taxonGroup: formatGroupName$2({
        title: row?.taxonGroupTitle,
        friendly: row?.taxonGroupFriendly
      }, labelMode)
    }));

    if (typeof table.setData === 'function') {
      table.setData(remappedRows);
    }

    element.__tanvisLatestRows = remappedRows;
  }

  function createSummary$2(startDate, endDate, count, area, taxonGroupName) {
    const summary = document.createElement('div');
    summary.classList.add('tanvis-table-header-text');
    summary.textContent = buildSummaryText$2(startDate, endDate, count, area, taxonGroupName);
    return summary;
  }

  function buildSummaryText$2(startDate, endDate, count, area, taxonGroupName) {
    const suffix = taxonGroupName ? ` for taxon group ${taxonGroupName}` : '';
    return `${count} new species between ${startDate} and ${endDate} for ${formatTableAreaLabel$2(area)}${suffix}`;
  }

  function refreshSummary$2(element, labelMode) {
    const state = element.__tanvisSummaryState;
    const summary = element.__tanvisSummaryElement;
    if (!state || !summary) {
      return;
    }

    const taxonGroupName = state.taxonGroupInfo ? formatGroupName$2(state.taxonGroupInfo, labelMode) : '';
    summary.textContent = buildSummaryText$2(state.startDate, state.endDate, state.count, state.area, taxonGroupName);
  }

  function formatTableAreaLabel$2(area) {
    const normalizedArea = normalizeAreaContractValue(area);
    if (normalizedArea === undefined || normalizedArea === null || normalizedArea === '' || normalizedArea === 'all' || normalizedArea === 'vc-all' || normalizedArea === 'all VCs') {
      return 'all VCs';
    }

    if (typeof normalizedArea === 'number') {
      return `vc${normalizedArea}`;
    }

    const candidate = String(normalizedArea).trim().toLowerCase();
    if (/^vc\d+$/.test(candidate)) {
      return candidate;
    }

    if (/^\d+$/.test(candidate)) {
      return `vc${candidate}`;
    }

    return candidate;
  }

  function createTableContainer$2({ Tabulator, pageSize, requestPage, element, loadId, status }) {
    const container = document.createElement('div');
    element.appendChild(container);

    const table = new Tabulator(container, {
      columns: columns$2,
      layout: 'fitDataFill',
      responsiveLayout: 'collapse',
      pagination: true,
      paginationMode: 'remote',
      paginationSize: pageSize,
      placeholder: 'No records found',
      ajaxURL: 'custom_handler',
      ajaxURLGenerator: function ajaxURLGenerator(url) {
        return url;
      },
      ajaxRequestFunc: async (url, config, params) => {
        try {
          const pageNumber = Number(params?.page || 1);
          const requestedPageSize = Number(params?.size || pageSize);
          return await requestPage({ pageNumber, pageSize: requestedPageSize });
        } catch (error) {
          if (element.__tanvisNewSpeciesLoadId === loadId) {
            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render new species table'));
          }
          throw error;
        }
      }
    });

    if (table && typeof table.on === 'function') {
      table.on('rowClick', function (e, row) {
        const rowData = row.getData();
        const speciesId = rowData.speciesId;

        const rowSelectedEvent = new CustomEvent('taxon-identified', {
          detail: { speciesId },
          bubbles: true,
          cancelable: true
        });

        container.dispatchEvent(rowSelectedEvent);
      });

    }

    container.dataset.tanvisTableContainer = 'true';
    container.__tanvisTable = table;
    return { container, table };
  }

  function getCurrentIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  async function buildNewSpeciesRecordsPage({ apiBase, startDate, endDate, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize, labelMode = 'scientific' }) {
    const offset = (pageNumber - 1) * pageSize;
    const payload = await fetchTaxonStatsInRange({
      apiBase,
      startDate,
      endDate,
      higherGeographyIdentifier,
      taxonGroupExternalKey,
      limit: pageSize,
      offset
    });

    //console.log('Fetched verified dates:', payload.data.map((row) => row.first_verified_record_date));

    const rows = getListData$5(payload);
    const totalRows = getTotalCount$1(payload);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    return {
      records: rows.map((row) => {
        return {
          speciesId: row.taxon_identifier,
          scientificName: `<i>${row.taxon__scientific_name}</i>`,
          commonName: row.taxon__vernacular_name || '',
          firstRecordDate: row.first_record_date,
          taxonGroup: formatGroupName$2({title: row.taxon_group__title, friendly: row.taxon_group__friendly}, labelMode),
          taxonGroupTitle: row.taxon_group__title,
          taxonGroupFriendly: row.taxon_group__friendly,
          verifiedStatus: row.first_verified_record_date
        };
      }),
      totalRows,
      totalPages
    };
  }

  function formatGroupName$2(group, labelMode = 'scientific') {
    const parsedNames = parseTaxonGroupDisplayNames(group);
    const displayName = labelMode === 'vernacular'
      ? (parsedNames.vernacularName || parsedNames.scientificName)
      : (parsedNames.scientificName || parsedNames.vernacularName);
    return displayName;
  }

  const taxonGroupsByApiBase$2 = new Map();

  // Resolved independently of table rows so the name is available even when a query returns no records.
  async function resolveTaxonGroupInfo$2(apiBase, taxonGroupExternalKey) {
    if (!taxonGroupExternalKey) {
      return null;
    }

    if (!taxonGroupsByApiBase$2.has(apiBase)) {
      taxonGroupsByApiBase$2.set(apiBase, fetchTaxonGroupsMap$2(apiBase));
    }

    const groupsMap = await taxonGroupsByApiBase$2.get(apiBase);
    return groupsMap.get(taxonGroupExternalKey) || null;
  }

  async function fetchTaxonGroupsMap$2(apiBase) {
    try {
      const resourceUrl = resolveResourceUrl$6(apiBase, 'taxon-groups');
      const payload = await fetchJson$8(resourceUrl.toString(), 'Failed to load taxon groups');
      const groups = getListData$5(payload);
      const map = new Map();
      for (const group of groups) {
        if (group?.external_key) {
          map.set(group.external_key, { title: group.title, friendly: group.friendly });
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  async function fetchTaxonStatsInRange({ apiBase, startDate, endDate, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
    const resourceUrl = resolveResourceUrl$6(apiBase, TAXON_STATS_RESOURCE$3);
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('first_record_date[gte]', startDate);
    pageUrl.searchParams.set('first_record_date[lte]', endDate);
    pageUrl.searchParams.set('include', 'taxon,taxon-group,taxon-rank');
    const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
    pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
    if (taxonGroupExternalKey) {
      pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
    }
    pageUrl.searchParams.set('taxon_rank__rank[eq]', 'Species');
    pageUrl.searchParams.set('limit', String(limit));
    pageUrl.searchParams.set('offset', String(offset));
    pageUrl.searchParams.set('sort', '-first_record_date');

    const payload = await fetchJson$8(pageUrl.toString(), 'Failed to load taxon-stats');
    return payload || {};
  }

  function resolveResourceUrl$6(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$8(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$5(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function getTotalCount$1(payload) {
    if (Number.isFinite(payload?.meta?.total)) {
      return Number(payload.meta.total);
    }

    if (Number.isFinite(payload?.total)) {
      return Number(payload.total);
    }

    if (Number.isFinite(payload?.last_row)) {
      return Number(payload.last_row);
    }

    return getListData$5(payload).length;
  }

  function areaToHigherGeographyIdentifier$2(area) {
    const normalizedArea = normalizeAreaContractValue(area);

    if (normalizedArea === 58) {
      return 58;
    }

    if (normalizedArea === 59) {
      return 59;
    }

    if (normalizedArea === 60) {
      return 60;
    }

    return undefined;
  }

  function clearControlSubscription$5(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea$5(config) {
    if (!config.control) {
      return normalizeAreaContractValue(config.area);
    }

    if (typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  function getEffectiveTaxonGroup$3(config) {
    if (typeof document === 'undefined') {
      return config?.groupId || '';
    }

    const controlElement = config.control ? document.getElementById(config.control) : null;
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visTaxonGroup')) {
      const controlGroupValue = controlElement.dataset.visTaxonGroup || '';
      if (controlGroupValue) {
        return controlGroupValue;
      }
    }

    return config?.groupId || '';
  }

  function getConfiguredPageSize$2(config) {
    const configuredPageSize = Number(config?.pageSize ?? config?.['data-vis-page-size'] ?? config?.['data-visPageSize'] ?? DEFAULT_PAGE_SIZE$2);
    if (!Number.isFinite(configuredPageSize) || configuredPageSize <= 0) {
      return DEFAULT_PAGE_SIZE$2;
    }

    return configuredPageSize;
  }

  function getEffectiveLabelMode$2(config, fallbackMode) {
    if (fallbackMode) {
      return fallbackMode;
    }

    const explicitControlValue = readControlLanguageValue$1(config);
    if (explicitControlValue) {
      return explicitControlValue;
    }

    if (config?.language) {
      return config.language;
    }

    return 'scientific';
  }

  function readControlLanguageValue$1(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    const controlLanguageValue = controlElement?.dataset?.visTaxonGroupLabelMode || controlElement?.dataset?.visLanguage || '';
    if (controlLanguageValue) {
      return controlLanguageValue;
    }

    return '';
  }

  function getEffectiveLabelModeForElement$2(element, config) {
    return element?.dataset?.visTaxonGroupLabelMode || getEffectiveLabelMode$2(config);
  }

  function getTabulatorGlobal$2() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  const newSpeciesTableAdapter = createNewSpeciesTableAdapter();

  function renderNewSpeciesTable(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    newSpeciesTableAdapter.render(element, config);
  }

  const TAXON_STATS_RESOURCE$2 = 'taxon-stats';
  const DEFAULT_PAGE_SIZE$1 = 10;
  const DEFAULT_TOP_N = 50;
  const columns$1 = [
    
    { title: 'Scientific', field: 'scientificName', formatter: 'html', headerSort: false },
    { title: 'Vernacular', field: 'commonName', headerSort: false , responsive: 8 },
    { title: 'Rarity', field: 'rarityCategory', headerSort: false },
    { title: 'Records', field: 'totalRecords', headerSort: false },
    { title: 'Tetrads', field: 'occupiedGridSquares', headerSort: false },
    { title: 'Trend', field: 'frequencyTrendScore', headerSort: false },
    { title: 'Group', field: 'taxonGroup', headerSort: false, responsive: 10 },
    { title: 'TVK', field: 'speciesId', headerSort: false , responsive: 10 }
  ];

  function createIncreasingSpeciesTableAdapter() {
    return {
      name: 'increasing-species-table',
      render(element, config) {
        clearControlSubscription$4(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$4(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const topN = parseTopN(renderConfig.topN) ?? DEFAULT_TOP_N;
        const apiBase = resolveApiBase();
        const higherGeographyIdentifier = areaToHigherGeographyIdentifier$1(renderConfig.area);
        const taxonGroupExternalKey = getEffectiveTaxonGroup$2(renderConfig);
        const effectiveLabelMode = getEffectiveLabelMode$1(renderConfig);
        const loadId = (element.__tanvisIncreasingLoadId || 0) + 1;
        element.__tanvisIncreasingLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;
        element.dataset.visTaxonGroupLabelMode = effectiveLabelMode;
        const pageSize = getConfiguredPageSize$1(renderConfig);

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event) {
              return;
            }

            if (event.type === 'area-change' || event.type === 'taxon-group-change') {
              const nextArea = getEffectiveArea$4(renderConfig);
              const nextTaxonGroupExternalKey = getEffectiveTaxonGroup$2(renderConfig);

              if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
                return;
              }

              element.dataset.visArea = nextArea === '' ? '' : String(nextArea);
              element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
              createIncreasingSpeciesTableAdapter().render(element, {
                ...renderConfig,
                area: nextArea
              });
              return;
            }

            if (event.type === 'language-change') {
              const nextLabelMode = getEffectiveLabelMode$1(renderConfig, event.labelMode);
              if (nextLabelMode === element.dataset.visTaxonGroupLabelMode) {
                return;
              }

              element.dataset.visTaxonGroupLabelMode = nextLabelMode;
              rerenderTableRows$1(element, { labelMode: nextLabelMode });
              refreshSummary$1(element, nextLabelMode);
            }
          });
        }

        const Tabulator = getTabulatorGlobal$1();

        if (!Tabulator) {
          clearElement(element);
          status.showError('Tabulator is not available. Include the Tabulator script before Tanvis.');
          return;
        }

        clearElement(element);
        const summary = createSummary$1(topN, 0, renderConfig.area);
        element.appendChild(summary);
        element.__tanvisSummaryElement = summary;
        element.__tanvisSummaryState = { topN, area: renderConfig.area, taxonGroupInfo: null };

        if (taxonGroupExternalKey) {
          resolveTaxonGroupInfo$1(apiBase, taxonGroupExternalKey).then((taxonGroupInfo) => {
            if (element.__tanvisIncreasingLoadId !== loadId || !element.__tanvisSummaryState) {
              return;
            }

            element.__tanvisSummaryState.taxonGroupInfo = taxonGroupInfo;
            refreshSummary$1(element, getEffectiveLabelModeForElement$1(element, renderConfig));
          });
        }

        createTableContainer$1({
          Tabulator,
          pageSize,
          requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
            const labelModeForRequest = getEffectiveLabelModeForElement$1(element, renderConfig);
            const pageResult = await buildIncreasingSpeciesRecordsPage({
              apiBase,
              topN,
              higherGeographyIdentifier,
              taxonGroupExternalKey,
              pageNumber,
              pageSize: requestedPageSize,
              labelMode: labelModeForRequest
            });

            if (element.__tanvisIncreasingLoadId !== loadId) {
              return {
                data: [],
                last_page: 1,
                last_row: 0
              };
            }

            element.__tanvisSummaryState.topN = topN;
            element.__tanvisSummaryState.area = renderConfig.area;
            refreshSummary$1(element, labelModeForRequest);
            element.__tanvisLatestRows = pageResult.records;
            return {
              data: pageResult.records,
              last_page: pageResult.totalPages,
              last_row: pageResult.totalRows
            };
          },
          element,
          loadId,
          status
        });

        const hasStylesheet = ensureStylesheetDependency(status, {
          libraryName: 'Tabulator',
          stylesheetHints: ['tabulator.min.css'],
          message: 'Tabulator stylesheet is missing. Include tabulator.min.css to ensure the table is styled correctly.'
        });

        if (hasStylesheet) {
          status.clear();
        }

      }
    };
  }

  function rerenderTableRows$1(element, { labelMode }) {
    const tableContainer = element?.querySelector('[data-tanvis-table-container="true"]');
    if (!tableContainer?.__tanvisTable) {
      return;
    }

    const table = tableContainer.__tanvisTable;
    const tableRows = typeof table?.getData === 'function' ? table.getData() : null;
    const rows = Array.isArray(tableRows) && tableRows.length > 0
      ? tableRows
      : (Array.isArray(element.__tanvisLatestRows)
        ? element.__tanvisLatestRows
        : []);

    const remappedRows = rows.map((row) => ({
      ...row,
      taxonGroup: formatGroupName$1({
        title: row?.taxonGroupTitle,
        friendly: row?.taxonGroupFriendly
      }, labelMode)
    }));

    if (typeof table.setData === 'function') {
      table.setData(remappedRows);
    }

    element.__tanvisLatestRows = remappedRows;
  }

  function createSummary$1(topN, count, area, taxonGroupName) {
    const summary = document.createElement('div');
    summary.classList.add('tanvis-table-header-text');
    summary.textContent = buildSummaryText$1(topN, area, taxonGroupName);
    return summary;
  }

  function buildSummaryText$1(topN, area, taxonGroupName) {
    const suffix = taxonGroupName ? ` for taxon group ${taxonGroupName}` : '';
    return `Top ${topN} species by frequency trend for ${formatTableAreaLabel$1(area)}${suffix}`;
  }

  function refreshSummary$1(element, labelMode) {
    const state = element.__tanvisSummaryState;
    const summary = element.__tanvisSummaryElement;
    if (!state || !summary) {
      return;
    }

    const taxonGroupName = state.taxonGroupInfo ? formatGroupName$1(state.taxonGroupInfo, labelMode) : '';
    summary.textContent = buildSummaryText$1(state.topN, state.area, taxonGroupName);
  }

  function formatTableAreaLabel$1(area) {
    const normalizedArea = normalizeAreaContractValue(area);
    if (normalizedArea === undefined || normalizedArea === null || normalizedArea === '' || normalizedArea === 'all' || normalizedArea === 'vc-all' || normalizedArea === 'all VCs') {
      return 'all VCs';
    }

    if (typeof normalizedArea === 'number') {
      return `vc${normalizedArea}`;
    }

    const candidate = String(normalizedArea).trim().toLowerCase();
    if (/^vc\d+$/.test(candidate)) {
      return candidate;
    }

    if (/^\d+$/.test(candidate)) {
      return `vc${candidate}`;
    }

    return candidate;
  }

  function createTableContainer$1({ Tabulator, pageSize, requestPage, element, loadId, status }) {
    const container = document.createElement('div');
    element.appendChild(container);

    const table = new Tabulator(container, {
      columns: columns$1,
      layout: 'fitDataFill',
      responsiveLayout: 'collapse',
      pagination: true,
      paginationMode: 'remote',
      paginationSize: pageSize,
      placeholder: 'No records found',
      ajaxURL: 'custom_handler',
      ajaxURLGenerator: function ajaxURLGenerator(url) {
        return url;
      },
      ajaxRequestFunc: async (url, config, params) => {
        try {
          const pageNumber = Number(params?.page || 1);
          const requestedPageSize = Number(params?.size || pageSize);
          return await requestPage({ pageNumber, pageSize: requestedPageSize });
        } catch (error) {
          if (element.__tanvisIncreasingLoadId === loadId) {
            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render increasing species table'));
          }
          throw error;
        }
      }
    });

    if (table && typeof table.on === 'function') {
      table.on('rowClick', function (e, row) {
        const rowData = row.getData();
        const speciesId = rowData.speciesId;

        const rowSelectedEvent = new CustomEvent('taxon-identified', {
          detail: { speciesId },
          bubbles: true,
          cancelable: true
        });

        container.dispatchEvent(rowSelectedEvent);
      });

    }

    container.dataset.tanvisTableContainer = 'true';
    container.__tanvisTable = table;
    return { container, table };
  }

  function parseTopN(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return Math.floor(parsed);
  }

  function getTabulatorGlobal$1() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  async function buildIncreasingSpeciesRecordsPage({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize, labelMode = 'scientific' }) {
    const effectiveTopN = Math.max(0, Math.floor(topN ?? DEFAULT_TOP_N));
    const effectivePageSize = Math.max(1, Math.floor(pageSize ?? DEFAULT_PAGE_SIZE$1));
    const offset = (pageNumber - 1) * effectivePageSize;
    const totalRows = effectiveTopN;
    const totalPages = Math.max(1, Math.ceil(totalRows / effectivePageSize));

    if (offset >= effectiveTopN) {
      return {
        records: [],
        totalRows,
        totalPages
      };
    }

    const limit = Math.min(effectivePageSize, Math.max(1, effectiveTopN - offset));
    const payload = await fetchTaxonStats$1({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset });
    const taxonStatsRows = getListData$4(payload);
    const rankedRows = taxonStatsRows.slice(0, effectiveTopN - offset);

    return {
      records: rankedRows.map((row) => {
        return {
          speciesId: row.taxon_identifier,
          vcNumber: row.geographic_region_identifier,
          rarityCategory: row.taxon__rarity_category || '',
          firstRecordDate: row.first_record_date,
          totalRecords: row.occurrences_count,
          occupiedGridSquares: row.grid_square_count,
          frequencyTrendScore: row.frequency_trend,
          scientificName: `<i>${row.taxon__scientific_name || ''}</i>`,
          commonName: formatVernacularName$1(row),
          taxonGroup: formatGroupName$1({ title: row.taxon_group__title, friendly: row.taxon_group__friendly }, labelMode),
          taxonGroupTitle: row.taxon_group__title,
          taxonGroupFriendly: row.taxon_group__friendly
        };
      }),
      totalRows,
      totalPages
    };
  }

  function formatGroupName$1(group, labelMode = 'scientific') {
    const parsedNames = parseTaxonGroupDisplayNames(group);
    const displayName = labelMode === 'vernacular'
      ? (parsedNames.vernacularName || parsedNames.scientificName)
      : (parsedNames.scientificName || parsedNames.vernacularName);
    return displayName;
  }

  const taxonGroupsByApiBase$1 = new Map();

  // Resolved independently of table rows so the name is available even when a query returns no records.
  async function resolveTaxonGroupInfo$1(apiBase, taxonGroupExternalKey) {
    if (!taxonGroupExternalKey) {
      return null;
    }

    if (!taxonGroupsByApiBase$1.has(apiBase)) {
      taxonGroupsByApiBase$1.set(apiBase, fetchTaxonGroupsMap$1(apiBase));
    }

    const groupsMap = await taxonGroupsByApiBase$1.get(apiBase);
    return groupsMap.get(taxonGroupExternalKey) || null;
  }

  async function fetchTaxonGroupsMap$1(apiBase) {
    try {
      const resourceUrl = resolveResourceUrl$5(apiBase, 'taxon-groups');
      const payload = await fetchJson$7(resourceUrl.toString(), 'Failed to load taxon groups');
      const groups = getListData$4(payload);
      const map = new Map();
      for (const group of groups) {
        if (group?.external_key) {
          map.set(group.external_key, { title: group.title, friendly: group.friendly });
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  async function fetchTaxonStats$1({ apiBase, topN, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
    const resourceUrl = resolveResourceUrl$5(apiBase, TAXON_STATS_RESOURCE$2);
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('include', 'taxon, taxon-group, taxon-rank');
    const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
    pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
    if (taxonGroupExternalKey) {
      pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
    }
    pageUrl.searchParams.set('taxon_rank__rank[eq]', 'Species');
    // Once the API exposes frequency_trend in taxon-stats responses, switch this to sort=frequency_trend.
    pageUrl.searchParams.set('sort', '-occurrences_count');
    pageUrl.searchParams.set('limit', String(limit));
    pageUrl.searchParams.set('offset', String(offset));

    const payload = await fetchJson$7(pageUrl.toString(), 'Failed to load taxon-stats');
    return payload || {};
  }
  function resolveResourceUrl$5(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$7(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$4(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function formatVernacularName$1(taxon) {
    const plural = taxon?.vernacular_names;
    if (Array.isArray(plural)) {
      return plural.join(', ');
    }

    return taxon?.taxon__vernacular_name || '';
  }

  function areaToHigherGeographyIdentifier$1(area) {
    const normalizedArea = normalizeAreaContractValue(area);

    if (normalizedArea === 58) {
      return 58;
    }

    if (normalizedArea === 59) {
      return 59;
    }

    if (normalizedArea === 60) {
      return 60;
    }

    return undefined;
  }

  function clearControlSubscription$4(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea$4(config) {
    if (!config.control) {
      return normalizeAreaContractValue(config.area);
    }

    if (typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  function getEffectiveTaxonGroup$2(config) {
    if (typeof document === 'undefined') {
      return config?.groupId || '';
    }

    const controlElement = config.control ? document.getElementById(config.control) : null;
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visTaxonGroup')) {
      const controlGroupValue = controlElement.dataset.visTaxonGroup || '';
      if (controlGroupValue) {
        return controlGroupValue;
      }
    }

    return config?.groupId || '';
  }

  function getConfiguredPageSize$1(config) {
    const configuredPageSize = Number(config?.pageSize ?? config?.['data-vis-page-size'] ?? config?.['data-visPageSize'] ?? DEFAULT_PAGE_SIZE$1);
    if (!Number.isFinite(configuredPageSize) || configuredPageSize <= 0) {
      return DEFAULT_PAGE_SIZE$1;
    }

    return configuredPageSize;
  }

  function getEffectiveLabelMode$1(config, fallbackMode) {
    if (fallbackMode) {
      return fallbackMode;
    }

    if (!config.control || typeof document === 'undefined') {
      return 'scientific';
    }

    const controlElement = document.getElementById(config.control);
    return controlElement?.dataset?.visTaxonGroupLabelMode || 'scientific';
  }

  function getEffectiveLabelModeForElement$1(element, config) {
    return element?.dataset?.visTaxonGroupLabelMode || getEffectiveLabelMode$1(config);
  }

  const increasingSpeciesTableAdapter = createIncreasingSpeciesTableAdapter();

  function renderIncreasingSpeciesTable(element, config) {
    // Renderers are Tanvis-facing entry points keyed by data-vis-type.
    // Adapters keep the implementation details for a specific library or API integration.
    increasingSpeciesTableAdapter.render(element, config);
  }

  const TAXON_STATS_RESOURCE$1 = 'taxon-stats';
  const DEFAULT_PAGE_SIZE = 10;
  const columns = [
    { title: 'Scientific', field: 'scientificName', formatter: 'html', headerSort: false },
    { title: 'Vernacular', field: 'commonName', headerSort: false, responsive: 9 },
    { title: 'Last record', field: 'lastRecordDate', headerSort: false },
    { title: 'Group', field: 'taxonGroup', headerSort: false, responsive: 9 },
    { title: 'TVK', field: 'speciesId', headerSort: false }
  ];

  function createSpeciesAbsentSinceAdapter() {
    return {
      name: 'species-absent-since',
      render(element, config) {
        clearControlSubscription$3(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$3(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const year = Number(renderConfig.year);
        const apiBase = resolveApiBase();
        const higherGeographyIdentifier = areaToHigherGeographyIdentifier(renderConfig.area);
        const taxonGroupExternalKey = getEffectiveTaxonGroup$1(renderConfig);
        const effectiveLabelMode = getEffectiveLabelMode(renderConfig);
        const loadId = (element.__tanvisSpeciesAbsentLoadId || 0) + 1;
        element.__tanvisSpeciesAbsentLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;
        element.dataset.visTaxonGroupLabelMode = effectiveLabelMode;
        const pageSize = getConfiguredPageSize(renderConfig);

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event) {
              return;
            }

            if (event.type === 'area-change' || event.type === 'taxon-group-change') {
              const nextArea = getEffectiveArea$3(renderConfig);
              const nextTaxonGroupExternalKey = getEffectiveTaxonGroup$1(renderConfig);

              if (nextArea === element.dataset.visArea && nextTaxonGroupExternalKey === (element.dataset.visTaxonGroup || '')) {
                return;
              }

              element.dataset.visArea = nextArea === '' ? '' : String(nextArea);
              element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
              createSpeciesAbsentSinceAdapter().render(element, {
                ...renderConfig,
                area: nextArea
              });
              return;
            }

            if (event.type === 'language-change') {
              const nextLabelMode = getEffectiveLabelMode(renderConfig, event.labelMode);
              if (nextLabelMode === element.dataset.visTaxonGroupLabelMode) {
                return;
              }

              element.dataset.visTaxonGroupLabelMode = nextLabelMode;
              rerenderTableRows(element, { labelMode: nextLabelMode });
              refreshSummary(element, nextLabelMode);
            }
          });
        }

        const Tabulator = getTabulatorGlobal();

        if (!Tabulator) {
          clearElement(element);
          status.showError('Tabulator is not available. Include the Tabulator script before Tanvis.');
          return;
        }

        clearElement(element);
        const summary = createSummary(year, 0, renderConfig.area);
        element.appendChild(summary);
        element.__tanvisSummaryElement = summary;
        element.__tanvisSummaryState = { year, area: renderConfig.area, count: 0, taxonGroupInfo: null };

        if (taxonGroupExternalKey) {
          resolveTaxonGroupInfo(apiBase, taxonGroupExternalKey).then((taxonGroupInfo) => {
            if (element.__tanvisSpeciesAbsentLoadId !== loadId || !element.__tanvisSummaryState) {
              return;
            }

            element.__tanvisSummaryState.taxonGroupInfo = taxonGroupInfo;
            refreshSummary(element, getEffectiveLabelModeForElement(element, renderConfig));
          });
        }

        createTableContainer({
          Tabulator,
          pageSize,
          requestPage: async ({ pageNumber, pageSize: requestedPageSize }) => {
            const labelModeForRequest = getEffectiveLabelModeForElement(element, renderConfig);
            const pageResult = await buildSpeciesAbsentSinceRecordsPage({
              apiBase,
              year,
              higherGeographyIdentifier,
              taxonGroupExternalKey,
              pageNumber,
              pageSize: requestedPageSize,
              labelMode: labelModeForRequest
            });

            if (element.__tanvisSpeciesAbsentLoadId !== loadId) {
              return {
                data: [],
                last_page: 1,
                last_row: 0
              };
            }

            element.__tanvisSummaryState.year = year;
            element.__tanvisSummaryState.area = renderConfig.area;
            element.__tanvisSummaryState.count = pageResult.totalRows;
            refreshSummary(element, labelModeForRequest);
            element.__tanvisLatestRows = pageResult.records;
            return {
              data: pageResult.records,
              last_page: pageResult.totalPages,
              last_row: pageResult.totalRows
            };
          },
          element,
          loadId,
          status
        });

        const hasStylesheet = ensureStylesheetDependency(status, {
          libraryName: 'Tabulator',
          stylesheetHints: ['tabulator.min.css'],
          message: 'Tabulator stylesheet is missing. Include tabulator.min.css to ensure the table is styled correctly.'
        });

        if (hasStylesheet) {
          status.clear();
        }

      }
    };
  }

  function rerenderTableRows(element, { labelMode }) {
    const tableContainer = element?.querySelector('[data-tanvis-table-container="true"]');
    if (!tableContainer?.__tanvisTable) {
      return;
    }

    const table = tableContainer.__tanvisTable;
    const tableRows = typeof table?.getData === 'function' ? table.getData() : null;
    const rows = Array.isArray(tableRows) && tableRows.length > 0
      ? tableRows
      : (Array.isArray(element.__tanvisLatestRows) ? element.__tanvisLatestRows : []);

    const remappedRows = rows.map((row) => ({
      ...row,
      taxonGroup: formatGroupName({
        title: row?.taxonGroupTitle,
        friendly: row?.taxonGroupFriendly
      }, labelMode)
    }));

    if (typeof table.setData === 'function') {
      table.setData(remappedRows);
    }

    element.__tanvisLatestRows = remappedRows;
  }

  function createSummary(year, count, area, taxonGroupName) {
    const summary = document.createElement('div');
    summary.classList.add('tanvis-table-header-text');
    summary.textContent = buildSummaryText(year, count, area, taxonGroupName);
    return summary;
  }

  function buildSummaryText(year, count, area, taxonGroupName) {
    const suffix = taxonGroupName ? ` for taxon group ${taxonGroupName}` : '';
    return `${count} species with last record date on or before ${year} for ${formatTableAreaLabel(area)}${suffix}`;
  }

  function refreshSummary(element, labelMode) {
    const state = element.__tanvisSummaryState;
    const summary = element.__tanvisSummaryElement;
    if (!state || !summary) {
      return;
    }

    const taxonGroupName = state.taxonGroupInfo ? formatGroupName(state.taxonGroupInfo, labelMode) : '';
    summary.textContent = buildSummaryText(state.year, state.count, state.area, taxonGroupName);
  }

  function formatTableAreaLabel(area) {
    const normalizedArea = normalizeAreaContractValue(area);
    if (normalizedArea === undefined || normalizedArea === null || normalizedArea === '' || normalizedArea === 'all' || normalizedArea === 'vc-all' || normalizedArea === 'all VCs') {
      return 'all VCs';
    }

    if (typeof normalizedArea === 'number') {
      return `vc${normalizedArea}`;
    }

    const candidate = String(normalizedArea).trim().toLowerCase();
    if (/^vc\d+$/.test(candidate)) {
      return candidate;
    }

    if (/^\d+$/.test(candidate)) {
      return `vc${candidate}`;
    }

    return candidate;
  }

  function createTableContainer({ Tabulator, pageSize, requestPage, element, loadId, status }) {
    const container = document.createElement('div');
    element.appendChild(container);

    const table = new Tabulator(container, {
      columns,
      layout: 'fitDataFill',
      responsiveLayout: 'collapse',
      pagination: true,
      paginationMode: 'remote',
      paginationSize: pageSize,
      placeholder: 'No records found',
      ajaxURL: 'custom_handler',
      ajaxURLGenerator: function ajaxURLGenerator(url) {
        return url;
      },
      ajaxRequestFunc: async (url, config, params) => {
        try {
          const pageNumber = Number(params?.page || 1);
          const requestedPageSize = Number(params?.size || pageSize);
          return await requestPage({ pageNumber, pageSize: requestedPageSize });
        } catch (error) {
          if (element.__tanvisSpeciesAbsentLoadId === loadId) {
            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render species absent since table'));
          }
          throw error;
        }
      }
    });

    table.on('rowClick', (event, row) => {
      const speciesId = row?.getData?.()?.speciesId;
      if (!speciesId) {
        return;
      }

      const rowSelectedEvent = new CustomEvent('taxon-identified', {
        detail: { speciesId },
        bubbles: true,
        cancelable: true
      });

      container.dispatchEvent(rowSelectedEvent);
    });

    container.dataset.tanvisTableContainer = 'true';
    container.__tanvisTable = table;
    return { container, table };
  }

  async function buildSpeciesAbsentSinceRecordsPage({ apiBase, year, higherGeographyIdentifier, taxonGroupExternalKey, pageNumber, pageSize, labelMode = 'scientific' }) {
    const cutoffDate = `${year}-12-31`;
    const offset = (pageNumber - 1) * pageSize;
    const payload = await fetchTaxonStatsAbsentSince({
      apiBase,
      cutoffDate,
      higherGeographyIdentifier,
      taxonGroupExternalKey,
      limit: pageSize,
      offset
    });

    const taxonStatsRows = getListData$3(payload);
    const totalRows = getTotalCount(payload);
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    return {
      records: taxonStatsRows.map((row) => {
        return {
          speciesId: row.taxon_identifier,
          scientificName: `<i>${row.taxon__scientific_name || ''}</i>`,
          commonName: formatVernacularName(row),
          lastRecordDate: row.last_record_date,
          taxonGroup: formatGroupName({ title: row.taxon_group__title, friendly: row.taxon_group__friendly }, labelMode),
          taxonGroupTitle: row.taxon_group__title,
          taxonGroupFriendly: row.taxon_group__friendly,
          vcNumber: row.geographic_region_identifier
        };
      }),
      totalRows,
      totalPages
    };
  }

  async function fetchTaxonStatsAbsentSince({ apiBase, cutoffDate, higherGeographyIdentifier, taxonGroupExternalKey, limit, offset }) {
    const resourceUrl = resolveResourceUrl$4(apiBase, TAXON_STATS_RESOURCE$1);
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('last_record_date[lte]', cutoffDate);
    pageUrl.searchParams.set('include', 'taxon,taxon-group,taxon-rank');
    pageUrl.searchParams.set('taxon_rank__rank[eq]', 'Species');
    const vcId = higherGeographyIdentifier === undefined ? null : higherGeographyIdentifier;
    pageUrl.searchParams.set('higher_geography_identifier[eq]', String(vcId));
    if (taxonGroupExternalKey) {
      pageUrl.searchParams.set('taxon_group__external_key[eq]', taxonGroupExternalKey);
    }
    pageUrl.searchParams.set('limit', String(limit));
    pageUrl.searchParams.set('offset', String(offset));
    pageUrl.searchParams.set('sort', '-last_record_date');

    const payload = await fetchJson$6(pageUrl.toString(), 'Failed to load taxon-stats');
    return payload || {};
  }

  function resolveResourceUrl$4(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$6(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$3(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function getTotalCount(payload) {
    if (Number.isFinite(payload?.meta?.total)) {
      return Number(payload.meta.total);
    }

    if (Number.isFinite(payload?.total)) {
      return Number(payload.total);
    }

    if (Number.isFinite(payload?.last_row)) {
      return Number(payload.last_row);
    }

    return getListData$3(payload).length;
  }

  function formatVernacularName(taxon) {
    const plural = taxon?.taxon__vernacular_names;
    if (Array.isArray(plural)) {
      return plural.join(', ');
    }

    return taxon?.vernacular_name || '';
  }

  function formatGroupName(group, labelMode = 'scientific') {
    const parsedNames = parseTaxonGroupDisplayNames(group);
    const displayName = labelMode === 'vernacular'
      ? (parsedNames.vernacularName || parsedNames.scientificName)
      : (parsedNames.scientificName || parsedNames.vernacularName);
    return displayName;
  }

  const taxonGroupsByApiBase = new Map();

  // Resolved independently of table rows so the name is available even when a query returns no records.
  async function resolveTaxonGroupInfo(apiBase, taxonGroupExternalKey) {
    if (!taxonGroupExternalKey) {
      return null;
    }

    if (!taxonGroupsByApiBase.has(apiBase)) {
      taxonGroupsByApiBase.set(apiBase, fetchTaxonGroupsMap(apiBase));
    }

    const groupsMap = await taxonGroupsByApiBase.get(apiBase);
    return groupsMap.get(taxonGroupExternalKey) || null;
  }

  async function fetchTaxonGroupsMap(apiBase) {
    try {
      const resourceUrl = resolveResourceUrl$4(apiBase, 'taxon-groups');
      const payload = await fetchJson$6(resourceUrl.toString(), 'Failed to load taxon groups');
      const groups = getListData$3(payload);
      const map = new Map();
      for (const group of groups) {
        if (group?.external_key) {
          map.set(group.external_key, { title: group.title, friendly: group.friendly });
        }
      }
      return map;
    } catch {
      return new Map();
    }
  }

  function areaToHigherGeographyIdentifier(area) {
    const normalizedArea = normalizeAreaContractValue(area);

    if (normalizedArea === 58) {
      return 58;
    }

    if (normalizedArea === 59) {
      return 59;
    }

    if (normalizedArea === 60) {
      return 60;
    }

    return undefined;
  }

  function clearControlSubscription$3(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getEffectiveArea$3(config) {
    if (!config.control) {
      return normalizeAreaContractValue(config.area);
    }

    if (typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  function getConfiguredPageSize(config) {
    const configuredPageSize = Number(config?.pageSize ?? config?.['data-vis-page-size'] ?? config?.['data-visPageSize'] ?? DEFAULT_PAGE_SIZE);
    if (!Number.isFinite(configuredPageSize) || configuredPageSize <= 0) {
      return DEFAULT_PAGE_SIZE;
    }

    return configuredPageSize;
  }

  function getEffectiveTaxonGroup$1(config) {
    if (typeof document === 'undefined') {
      return config?.groupId || '';
    }

    const controlElement = config.control ? document.getElementById(config.control) : null;
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visTaxonGroup')) {
      const controlGroupValue = controlElement.dataset.visTaxonGroup || '';
      if (controlGroupValue) {
        return controlGroupValue;
      }
    }

    return config?.groupId || '';
  }

  function getEffectiveLabelMode(config, fallbackMode) {
    if (fallbackMode) {
      return fallbackMode;
    }

    const explicitControlValue = readControlLanguageValue(config);
    if (explicitControlValue) {
      return explicitControlValue;
    }

    if (config?.language) {
      return config.language;
    }

    return 'scientific';
  }

  function readControlLanguageValue(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    const controlLanguageValue = controlElement?.dataset?.visTaxonGroupLabelMode || controlElement?.dataset?.visLanguage || '';
    if (controlLanguageValue) {
      return controlLanguageValue;
    }

    return '';
  }

  function getEffectiveLabelModeForElement(element, config) {
    return element?.dataset?.visTaxonGroupLabelMode || getEffectiveLabelMode(config);
  }

  function getTabulatorGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.Tabulator || null;
  }

  const speciesAbsentSinceAdapter = createSpeciesAbsentSinceAdapter();

  function renderSpeciesAbsentSince(element, config) {
    speciesAbsentSinceAdapter.render(element, config);
  }

  function normalizeMapTypeMode(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'leaflet') {
      return 'leaflet';
    }

    if (normalized === 'switch') {
      return 'switch';
    }

    return 'static';
  }

  function normalizeBaseMapType(value) {
    return String(value || '').trim().toLowerCase() === 'leaflet' ? 'leaflet' : 'static';
  }

  function getStoredBaseMapType(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'leaflet') {
      return 'leaflet';
    }

    if (normalized === 'static') {
      return 'static';
    }

    return '';
  }

  function resolveActiveMapType(mapElement, mapTypeMode, datasetKey) {
    if (mapTypeMode !== 'switch') {
      return mapTypeMode;
    }

    const savedMapType = getStoredBaseMapType(getDatasetValue(mapElement, datasetKey));
    const fallbackMapType = getStoredBaseMapType(getDatasetValue(mapElement?.parentElement, datasetKey));
    const effectiveMapType = savedMapType || fallbackMapType || 'static';

    setDatasetValue(mapElement, datasetKey, effectiveMapType);
    if (!savedMapType && fallbackMapType && mapElement?.parentElement) {
      setDatasetValue(mapElement.parentElement, datasetKey, fallbackMapType);
    }

    return effectiveMapType;
  }

  function ensureMapControlsContainer(hostElement, className = 'tanvis-grid-stats-map-controls') {
    for (const child of hostElement.children) {
      if (child.classList?.contains(className)) {
        return child;
      }
    }

    const controls = document.createElement('div');
    controls.className = className;
    hostElement.appendChild(controls);
    return controls;
  }

  function createMapTypeSwitchControl({
    mapElement,
    activeMapType,
    onChange,
    fallbackId = 'tanvis-map',
    controlClassName = 'tanvis-grid-stats-map-type-switch'
  }) {
    const group = createRadioGroup({
      name: getMapTypeSwitchName(mapElement, fallbackId),
      selectedValue: activeMapType,
      items: [
        { value: 'static', label: 'Static' },
        { value: 'leaflet', label: 'Leaflet' }
      ],
      onChange: (value) => {
        const nextMapType = normalizeBaseMapType(value);
        if (nextMapType === activeMapType) {
          return;
        }

        onChange(nextMapType);
      }
    });

    group.classList.add(controlClassName);
    return group;
  }

  function getMapTypeSwitchName(mapElement, fallbackId) {
    const base = mapElement.id || fallbackId;
    return `${base}-map-type-switch`;
  }

  function getDatasetValue(element, datasetKey) {
    if (!element) {
      return '';
    }

    const attributeName = `data-${datasetKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    const attributeValue = element.getAttribute?.(attributeName);
    if (attributeValue !== null && attributeValue !== undefined && attributeValue !== '') {
      return attributeValue;
    }

    return element.dataset?.[datasetKey] || '';
  }

  function setDatasetValue(element, datasetKey, value) {
    if (!element) {
      return;
    }

    const attributeName = `data-${datasetKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    element.setAttribute?.(attributeName, value);
    if (element.dataset) {
      element.dataset[datasetKey] = value;
    }
  }

  const D3_DEPENDENCY_MESSAGE = 'D3 is not available. Include d3.v7.min.js to use Tanvis mapping.';

  function getD3() {
    // Expose D3 via the global object so unit tests can provide it without
    // bundling D3 into the library build used by Rollup.
    const globalD3 = globalThis.d3 ?? globalThis.window?.d3;

    if (!globalD3?.scaleSequential || !globalD3?.interpolateCividis || !globalD3?.interpolateViridis) {
      throw new Error(D3_DEPENDENCY_MESSAGE);
    }

    return globalD3;
  }

  function resolveColours(recs, transform, colourScale) {
    const d3 = getD3();

    let colouredRecs = recs.map(r => ({ ...r }));

    // Carry out any mathematical transformation requested
    switch (transform) {
      case "deciles":
        colouredRecs = transDeciles(colouredRecs, 'val');
        break;
      case "sqrt":
        colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.sqrt(r.val) }));
        break;
      case "cbrt":
        colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.cbrt(r.val) }));
        break;
      case "log":
        colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.log(r.val) }));
        break;
      case "log10":
        colouredRecs = colouredRecs.map(r => ({ ...r, val: Math.log10(r.val) }));
        break;
    }

    const minVal = Math.min(...colouredRecs.map(r => r.val));
    const maxVal = Math.max(...colouredRecs.map(r => r.val));

    const colourTrans = d3.scaleSequential()
      .domain([minVal, maxVal]);

    switch (colourScale) {
      case "cividis":
        colourTrans.interpolator(d3.interpolateCividis);
        colouredRecs = colouredRecs.map(r => ({ ...r, colour: colourTrans(r.val) }));
        break;
      case "viridis":
        colourTrans.interpolator(d3.interpolateViridis);
        colouredRecs = colouredRecs.map(r => ({ ...r, colour: colourTrans(r.val) }));
        break;
      default:
        colouredRecs = colouredRecs.map(r => ({ ...r, colour: colourScale }));
        break;
    }

    //console.log('colouredRecs', colouredRecs);

    return colouredRecs;
  }


  function transDeciles(arr, key) {
    // 1. Create a shallow copy and sort by the target key ascending
    const sorted = [...arr].sort((a, b) => a[key] - b[key]);
    const total = sorted.length;
    
    // 2. Count frequencies of each unique value
    const counts = {};
    for (const item of sorted) {
      const val = item[key];
      counts[val] = (counts[val] || 0) + 1;
    }
    
    // 3. Map unique values to their respective deciles based on cumulative count
    const valueToDecile = {};
    let cumulativeCount = 0;
    
    for (const item of sorted) {
      const val = item[key];
      
      // Skip if we already assigned a decile to this unique value
      if (valueToDecile[val] !== undefined) continue;
      
      // Add the full weight of this value group to the cumulative total
      cumulativeCount += counts[val];
      
      // Calculate decile (1-10) using the midpoint/end of the current cluster
      let decile = Math.ceil((cumulativeCount / total) * 10);
      
      // Ensure boundaries stay within 1 and 10
      decile = Math.max(1, Math.min(10, decile));
      
      valueToDecile[val] = decile;
    }
    
    // 4. Replace the original values with their corresponding deciles in the array
    arr.forEach(item => {
      item[key] = valueToDecile[item[key]];
    });

    return arr;
  }

  const OCCURRENCES_RESOURCE = 'occurrences';
  const OCCURRENCES_MAP_TYPE_KEY = 'occurrences';
  const DEFAULT_PAGE_LIMIT$3 = 10000;
  let mapData$1 = [];

  function shouldLogSpeciesMapDebug() {
    if (typeof window === 'undefined') {
      return false;
    }

    if (window.__tanvisSpeciesMapDebug === true) {
      return true;
    }

    const searchParams = new URLSearchParams(window.location?.search || '');
    return searchParams.get('tanvisDebug') === 'species-map';
  }

  function logSpeciesMapDebug(message, details = {}) {
    if (!shouldLogSpeciesMapDebug()) {
      return;
    }

    console.log('[species-map]', message, details);
  }

  function createSpeciesMapAdapter() {
    return {
      name: 'species-map',
      render(element, config) {
        const effectiveArea = getEffectiveArea$2(config);
        const normalizedArea = normalizeAreaContractValue(effectiveArea);
        const renderConfig = {
          ...config,
          area: normalizedArea
        };
        const taxonIdSourceId = renderConfig.taxonIdSource || '';
        const shouldPreserveTaxonIdSourceSubscription = Boolean(
          element.__tanvisTaxonIdSourceCleanup &&
          element.__tanvisTaxonIdSourceId === taxonIdSourceId
        );
        const shouldPreserveControlSubscription = Boolean(
          element.__tanvisControlCleanup &&
          element.__tanvisControlId === renderConfig.control
        );
        if (!shouldPreserveTaxonIdSourceSubscription) {
          clearTaxonIdSourceSubscription$4(element);
        }
        if (!shouldPreserveControlSubscription) {
          clearControlSubscription$2(element);
        }

        const status = createVisStatusReporter(element);
        const existingMap = element.__tanvisSpeciesMapInstance;
        const shouldReuseExistingMap = Boolean(
          config.reuseExistingMap && existingMap && !config.forceCreateMap
        );
        status.showInfo('Loading...');

        const currentSpeciesFromElement = element.dataset.visTaxonid || '';
        const speciesCode = currentSpeciesFromElement || renderConfig.species || renderConfig.taxonId || '';
        const apiBase = resolveApiBase();
        const areaValue = normalizeAreaContractValue(renderConfig.area ?? '');

        logSpeciesMapDebug('render:start', {
          loadId: (element.__tanvisSpeciesMapLoadId || 0) + 1,
          area: areaValue,
          species: speciesCode,
          control: renderConfig.control || '',
          reuseExistingMap: shouldReuseExistingMap,
          forceCreateMap: Boolean(config.forceCreateMap)
        });

        if (!hasD3Dependency()) {
          status.showError(D3_DEPENDENCY_MESSAGE);
          return;
        }
        const taxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
        const loadId = (element.__tanvisSpeciesMapLoadId || 0) + 1;
        element.__tanvisSpeciesMapLoadId = loadId;
        element.dataset.visArea = renderConfig.area;
        element.dataset.visTaxonGroup = taxonGroupExternalKey;
        element.dataset.visTaxonid = speciesCode;

        if (renderConfig.control) {
          if (!shouldPreserveControlSubscription) {
            const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
              if (!event || (event.type !== 'area-change' && event.type !== 'taxon-group-change')) {
                return;
              }

              const nextArea = getEffectiveArea$2(renderConfig);
              const nextTaxonGroupExternalKey = getEffectiveTaxonGroup(renderConfig);
              const currentArea = normalizeAreaContractValue(element.dataset.visArea);
              const currentTaxonGroup = element.dataset.visTaxonGroup || '';

              if (nextArea === currentArea && nextTaxonGroupExternalKey === currentTaxonGroup) {
                return;
              }

              element.dataset.visArea = nextArea;
              element.dataset.visTaxonGroup = nextTaxonGroupExternalKey;
              logSpeciesMapDebug('control:area-change', {
                area: nextArea,
                taxonGroup: nextTaxonGroupExternalKey,
                control: renderConfig.control || ''
              });
              createSpeciesMapAdapter().render(element, {
                ...renderConfig,
                area: nextArea
              });
            });

            element.__tanvisControlCleanup = () => {
              controlBusCleanup?.();
            };
            element.__tanvisControlId = renderConfig.control;
          }
        }

        if (renderConfig.taxonIdSource) {
          if (!shouldPreserveTaxonIdSourceSubscription) {
            element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource$4(taxonIdSourceId, (speciesId) => {
              if (!speciesId || speciesId === element.dataset.visTaxonid) {
                return;
              }

              element.dataset.visTaxonid = speciesId;
              createSpeciesMapAdapter().render(element, {
                ...renderConfig,
                species: speciesId,
                reuseExistingMap: true
              });
            });
            element.__tanvisTaxonIdSourceId = taxonIdSourceId;
          }
        }

        let map = existingMap;
        let mapContainer = element.__tanvisSpeciesMapContainer || null;

        if (!mapContainer || !mapContainer.isConnected) {
          mapContainer = document.createElement('div');
          mapContainer.dataset.tanvisSpeciesMap = 'map';
          element.appendChild(mapContainer);
        }

        if (!shouldReuseExistingMap) {
          clearElement(mapContainer);
          map = null;
        }

        element.__tanvisSpeciesMapContainer = mapContainer;
        status.clear();

        try {
          if (!map || !shouldReuseExistingMap) {
            map = renderMapBackend$1(mapContainer, renderConfig, element);
            element.__tanvisSpeciesMapInstance = map;
          }

          logSpeciesMapDebug('render:map-ready', {
            loadId,
            area: renderConfig.area ?? '',
            species: speciesCode,
            reusedExistingMap: shouldReuseExistingMap,
            hasMapInstance: Boolean(map)
          });
        } catch (error) {
          if (element.__tanvisSpeciesMapLoadId !== loadId) {
            return;
          }

          clearElement(element);
          status.showError(normalizeErrorMessage(error, 'Failed to render species map'));
          return;
        }

        logSpeciesMapDebug('fetch:start', {
          loadId,
          area: renderConfig.area ?? '',
          species: speciesCode
        });

        fetchSpeciesOccurrences({
          apiBase,
          speciesCode,
          area: renderConfig.area,
        })
          .then((rows) => {
            if (element.__tanvisSpeciesMapLoadId !== loadId) {
              logSpeciesMapDebug('fetch:ignored-stale-response', {
                loadId,
                area: renderConfig.area ?? '',
                species: speciesCode
              });
              return;
            }

            const occurrenceRows = Array.isArray(rows) ? rows : [];

            logSpeciesMapDebug('fetch:resolved', {
              loadId,
              area: renderConfig.area ?? '',
              species: speciesCode,
              rowCount: occurrenceRows.length
            });

            logSpeciesMapDebug('adapter:apply-data', {
              loadId,
              area: renderConfig.area ?? '',
              species: speciesCode,
              mapInstanceId: map?.__tanvisMapInstanceId,
              mapArea: map?.__tanvisMapArea,
              elementId: element.id
            });

            applyOccurrenceDataToMap(map, occurrenceRows, {
              loadId,
              area: renderConfig.area ?? '',
              species: speciesCode,
              mapInstanceId: map?.__tanvisMapInstanceId,
              mapArea: map?.__tanvisMapArea,
              elementId: element.id
            });
          })
          .catch((error) => {
            if (element.__tanvisSpeciesMapLoadId !== loadId) {
              return;
            }

            logSpeciesMapDebug('fetch:error', {
              loadId,
              area: renderConfig.area ?? '',
              species: speciesCode,
              error: normalizeErrorMessage(error, 'Failed to render species map')
            });
            console.error('[species-map] failed to fetch occurrences:', error);
            status.showError(normalizeErrorMessage(error, 'Failed to render species map'));
          });
      }
    };
  }

  function hasD3Dependency() {
    return typeof globalThis.d3 !== 'undefined' || typeof globalThis.window?.d3 !== 'undefined';
  }

  function renderMapBackend$1(element, config, hostElement) {
    const mapTypeMode = normalizeMapTypeMode(config.mapType);
    const shouldShowMapTypeSwitch = mapTypeMode === 'switch'
      || hostElement?.dataset?.tanvisSpeciesMapControlMode === 'switch'
      || element?.dataset?.tanvisSpeciesMapControlMode === 'switch';
    const activeMapType = resolveActiveMapType(element, mapTypeMode, 'tanvisSpeciesMapActiveMapType');
    const pointOpacity = activeMapType === 'leaflet' ? 0.7 : 1;
    const dotStyleOptions = getDotStyleOptions$1(config, hostElement);
    const mapTypesSel = {
      [OCCURRENCES_MAP_TYPE_KEY]: () => createOccurrenceData(pointOpacity, dotStyleOptions),
    };

    let map;

    if (activeMapType === 'leaflet') {
      map = renderLeafletAtlasMap(element, config, {
        idPrefix: 'tanvis-species-map',
        errorMessage: 'Failed to render species map',
        mapTypesSel,
        mapTypesKey: OCCURRENCES_MAP_TYPE_KEY
      });
    } else {
      map = renderStaticAtlasMap(element, config, {
        idPrefix: 'tanvis-species-map',
        errorMessage: 'Failed to render species map',
        mapTypesSel,
        mapTypesKey: OCCURRENCES_MAP_TYPE_KEY,
        subscribeToAreaControl: false
      });
    }

    if (shouldShowMapTypeSwitch) {
      element.dataset.tanvisSpeciesMapControlMode = 'switch';
      if (hostElement) {
        hostElement.dataset.tanvisSpeciesMapControlMode = 'switch';
      }
    } else {
      delete element.dataset.tanvisSpeciesMapControlMode;
      if (hostElement) {
        delete hostElement.dataset.tanvisSpeciesMapControlMode;
      }
    }

    renderMapControlGroup$1(element, {
      activeMapType,
      showMapTypeSwitch: shouldShowMapTypeSwitch,
      onMapTypeChange: (nextMapType) => {
        element.dataset.tanvisSpeciesMapActiveMapType = nextMapType;
        if (hostElement) {
          hostElement.dataset.tanvisSpeciesMapActiveMapType = nextMapType;
        }

        createSpeciesMapAdapter().render(hostElement, {
          ...config,
          area: hostElement?.dataset?.visArea || config.area,
          species: hostElement?.dataset?.visTaxonid || config.species || config.taxonId,
          mapType: 'switch',
          taxonIdSource: config.taxonIdSource,
          control: config.control,
          forceCreateMap: true
        });
      }
    });

    return map;
  }

  function renderMapControlGroup$1(mapElement, options) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();
    const hostElement = mapElement.parentElement;
    if (!hostElement) {
      return;
    }

    const controls = ensureMapControlsContainer(hostElement);
    clearElement(controls);

    if (!options.showMapTypeSwitch) {
      controls.remove();
      return;
    }

    controls.appendChild(createMapTypeSwitchControl({
      mapElement,
      activeMapType: options.activeMapType,
      onChange: options.onMapTypeChange,
      fallbackId: 'tanvis-species-map'
    }));
  }

  function clearControlSubscription$2(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
    delete element.__tanvisControlId;
  }

  function clearTaxonIdSourceSubscription$4(element) {
    const cleanup = element?.__tanvisTaxonIdSourceCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisTaxonIdSourceCleanup;
    delete element.__tanvisTaxonIdSourceId;
  }

  function subscribeToTaxonIdSource$4(taxonIdSourceId, onSpeciesSelected) {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
    if (!taxonIdSourceElement) {
      return undefined;
    }

    const onRowSelected = (event) => {
      const speciesId = event?.detail?.speciesId;
      if (typeof speciesId !== 'string' || !speciesId.trim()) {
        return;
      }

      onSpeciesSelected(speciesId.trim());
    };

    taxonIdSourceElement.addEventListener('taxon-identified', onRowSelected);
    return () => {
      taxonIdSourceElement.removeEventListener('taxon-identified', onRowSelected);
    };
  }

  function getDotStyleOptions$1(config = {}, hostElement) {
    if (!hostElement || typeof hostElement.dataset !== 'object') {
      return {
        dotColour: config.dotColour || '',
        transformation: config.transformation || '',
        shape: config.dotShape || 'circle'
      };
    }

    return {
      dotColour: config.dotColour ?? hostElement.dataset.visDotColour ?? '',
      transformation: config.transformation ?? hostElement.dataset.visTransformation ?? '',
      shape: config.dotShape ?? hostElement.dataset.visDotShape ?? 'circle'
    };
  }

  function applyOccurrenceDataToMap(map, occurrenceRows = [], context = {}) {
    mapData$1 = Array.isArray(occurrenceRows) ? occurrenceRows : [];

    logSpeciesMapDebug('map:apply-data', {
      ...context,
      rowCount: mapData$1.length
    });

    if (!map || typeof map.setMapType !== 'function' || typeof map.redrawMap !== 'function') {
      logSpeciesMapDebug('map:skipped', { ...context, rowCount: mapData$1.length });
      return;
    }

    logSpeciesMapDebug('map:redraw', {
      ...context,
      rowCount: mapData$1.length,
      mapInstanceId: map?.__tanvisMapInstanceId,
      mapArea: map?.__tanvisMapArea,
      elementId: map?.__tanvisMapElementId
    });
    map.setMapType(OCCURRENCES_MAP_TYPE_KEY);

    map.redrawMap();

    return map;
  }

  function getEffectiveArea$2(config) {
    if (!config.control) {
      return normalizeAreaContractValue(config.area);
    }

    if (typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  function getEffectiveTaxonGroup(config) {
    if (!config.control || typeof document === 'undefined') {
      return '';
    }

    const controlElement = document.getElementById(config.control);
    return controlElement?.dataset?.visTaxonGroup || '';
  }

  async function fetchSpeciesOccurrences({ apiBase, speciesCode, area }) {
    if (!speciesCode) {
      return [];
    }

    const resourceUrl = resolveResourceUrl$3(apiBase, OCCURRENCES_RESOURCE);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('taxon_identifier[eq]', speciesCode);

      if (area) {
        pageUrl.searchParams.set('higher_geography_identifier[eq]', String(area));
      }

      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$3));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$5(pageUrl.toString(), 'Failed to load occurrences');
      const pageRows = getListData$2(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$3) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$3;
    }

    return rows;
  }

  function resolveResourceUrl$3(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$5(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$2(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function createOccurrenceData(opacity = 1, options = {}) {
    return new Promise(function (resolve) {
      const { dotColour = '', transformation = '', shape = 'circle' } = options || {};

      if (!hasD3Dependency()) {
        throw new Error(D3_DEPENDENCY_MESSAGE);
      }

      // mapData contains occurrence data which obviously can include many
      // records for a single grid reference. So we need to convert this to
      // have one record per grid reference, with the number of occurrences 
      // for each grid reference. This is done by grouping the data by grid 
      // reference and counting the occurrences.
      let recs = [];
      mapData$1.forEach(r => {
        // Filter out records with no grid reference
        if (!r.grid_ref_2km) {
          return;
        } 

        // Filter out records with invalid tetrad grid reference
        if (!/^[A-HJ-Z]{2}\d{2}[A-NP-Z]$/.test(r.grid_ref_2km)) {
          return;
        }

        const existing = recs.find(item => item.gr === r.grid_ref_2km);
        if (existing) {
          existing.val += 1;
        } else {
          recs.push({ 
            gr: r.grid_ref_2km, 
            val: 1
          });
        }
      });

      // Enrich with colour and caption
      recs.forEach(r => {
        r.caption = `${r.gr}: ${r.val} records`;
      });

      const resolvedTransform = transformation || '';
      const resolvedColourScale = dotColour || 'black';
      recs = resolveColours(recs, resolvedTransform, resolvedColourScale);

      resolve({ records: recs, size: 1, precision: 2000, shape, opacity });
    });
  }

  const speciesMapAdapter = createSpeciesMapAdapter();

  function renderSpeciesMap(element, config) {
    speciesMapAdapter.render(element, config);
  }

  const GRID_SQUARE_STATS_RESOURCE = 'grid-square-stats';
  const DEFAULT_PAGE_LIMIT$2 = 10000;
  const GRID_STATS_RECORDS_KEY = 'grid-stats-records';
  const GRID_STATS_SPECIES_KEY = 'grid-stats-species';
  const GRID_STATS_RARITY_KEY = 'grid-stats-rarity';

  let mapData = [];

  function createGridStatsMapAdapter() {
    return {
      name: 'grid-stats-map',
      render(element, config) {
        clearControlSubscription$1(element);
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        const effectiveArea = getEffectiveArea$1(config);
        const renderConfig = effectiveArea === config.area
          ? config
          : {
              ...config,
              area: effectiveArea
            };

        const apiBase = resolveApiBase();
        const geographicRegionIdentifier = areaToGeographicRegionIdentifier(renderConfig.area);
        const loadId = (element.__tanvisGridStatsMapLoadId || 0) + 1;
        element.__tanvisGridStatsMapLoadId = loadId;
        element.dataset.visArea = renderConfig.area;

        if (renderConfig.control) {
          element.__tanvisControlCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || event.type !== 'area-change') {
              return;
            }

            const nextArea = getEffectiveArea$1(renderConfig);

            if (nextArea === element.dataset.visArea) {
              return;
            }

            element.dataset.visArea = nextArea;
            createGridStatsMapAdapter().render(element, {
              ...renderConfig,
              area: nextArea
            });
          });
        }

        buildGridStatsMapRecords({ apiBase, geographicRegionIdentifier })
          .then((records) => {
            if (element.__tanvisGridStatsMapLoadId !== loadId) {
              return;
            }

            clearElement(element);
            //const summary = createSummary(records.length, renderConfig.area);
            const mapContainer = document.createElement('div');

            //element.appendChild(summary);
            element.appendChild(mapContainer);
            status.clear();

            mapData = records;
            // Convert string to number objects for important properties
            mapData = mapData.map(r => ({
              ...r,
              occurrences_count: Number(r.occurrences_count),
              species_count: Number(r.species_count)
            }));

            //console.log('[grid-stats-map] retrieved records:', mapData);

            renderMapBackend(mapContainer, renderConfig, element);
          })
          .catch((error) => {
            if (element.__tanvisGridStatsMapLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render grid stats map'));
          });
      }
    };
  }

  function renderMapBackend(mapElement, config, hostElement) {
    const mapTypeMode = normalizeMapTypeMode(config.mapType);
    const activeMapType = resolveActiveMapType(mapElement, mapTypeMode, 'tanvisGridStatsActiveMapType');
    const pointOpacity = activeMapType === 'leaflet' ? 0.7 : 1;
    const gridStatsType = normalizeGridStatsType(config.gridStatsType);
    const showGridStatsSwitch = gridStatsType === 'switch';
    const showMapTypeSwitch = mapTypeMode === 'switch';
    const selectedMapTypeKey = resolveSelectedMapTypeKey(mapElement, gridStatsType);
    const dotStyleOptions = getDotStyleOptions(config, hostElement);
    const mapTypesSel = {
      [GRID_STATS_RECORDS_KEY]: () => createRecordNumberData(pointOpacity, dotStyleOptions),
      [GRID_STATS_SPECIES_KEY]: () => createSpeciesNumberData(pointOpacity, dotStyleOptions),
      [GRID_STATS_RARITY_KEY]: () => createRarityNumberData(pointOpacity, dotStyleOptions),
    };

    let map;

    if (activeMapType === 'leaflet') {
      map = renderLeafletAtlasMap(mapElement, config, {
        idPrefix: 'tanvis-grid-stats-map',
        errorMessage: 'Failed to render grid stats map',
        mapTypesSel,
        mapTypesKey: selectedMapTypeKey
      });
    } else {
      //console.log('Rendering static grid stats map with records:', mapData);

      map = renderStaticAtlasMap(mapElement, config, {
        idPrefix: 'tanvis-grid-stats-map',
        errorMessage: 'Failed to render grid stats map',
        mapTypesSel,
        mapTypesKey: selectedMapTypeKey
      });
    }

    renderMapControlGroup(mapElement, {
      activeMapType,
      selectedMapTypeKey,
      showMapTypeSwitch,
      showGridStatsSwitch,
      onMapTypeChange: (nextMapType) => {
        mapElement.dataset.tanvisGridStatsActiveMapType = nextMapType;
        if (mapElement.parentElement) {
          mapElement.parentElement.dataset.tanvisGridStatsActiveMapType = nextMapType;
        }
        renderMapBackend(mapElement, config, mapElement.parentElement);
      },
      onGridStatsTypeChange: (nextMapTypeKey) => {
        mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = nextMapTypeKey;
        applyMapTypeSelection(map, nextMapTypeKey);
      }
    });

    return map;
  }

  function renderMapControlGroup(mapElement, options) {
    if (typeof document === 'undefined') {
      return;
    }

    ensureSharedStyles();
    const hostElement = mapElement.parentElement;
    if (!hostElement) {
      return;
    }

    const controls = ensureMapControlsContainer(hostElement);
    clearElement(controls);

    if (!options.showMapTypeSwitch && !options.showGridStatsSwitch) {
      controls.remove();
      return;
    }

    if (options.showMapTypeSwitch) {
      controls.appendChild(createMapTypeSwitchControl({
        mapElement,
        activeMapType: options.activeMapType,
        onChange: options.onMapTypeChange,
        fallbackId: 'tanvis-grid-stats-map'
      }));
    }

    if (options.showGridStatsSwitch) {
      controls.appendChild(createGridStatsTypeSwitchControl(mapElement, options.selectedMapTypeKey, options.onGridStatsTypeChange));
    }
  }

  function createGridStatsTypeSwitchControl(mapElement, selectedMapTypeKey, onChange) {
    const group = createRadioGroup({
      name: getGridStatsSwitchName(mapElement),
      selectedValue: selectedMapTypeKey === GRID_STATS_SPECIES_KEY ? 'species' : selectedMapTypeKey === GRID_STATS_RARITY_KEY ? 'rarity' : 'records',
      items: [
        { value: 'records', label: 'Records' },
        { value: 'species', label: 'Species' },
        { value: 'rarity', label: 'Rarity' }
      ],
      onChange: (value) => {
        const mapTypeKey = value === 'species'
          ? GRID_STATS_SPECIES_KEY
          : value === 'rarity'
            ? GRID_STATS_RARITY_KEY
            : GRID_STATS_RECORDS_KEY;
        onChange(mapTypeKey);
      }
    });

    group.classList.add('tanvis-grid-stats-switch');
    return group;
  }

  function applyMapTypeSelection(map, mapTypeKey) {
    if (!map || typeof map.setMapType !== 'function' || typeof map.redrawMap !== 'function') {
      return;
    }

    map.setMapType(mapTypeKey);
    map.redrawMap();
  }

  function getGridStatsSwitchName(mapElement) {
    const base = mapElement.id || 'tanvis-grid-stats-map';
    return `${base}-switch`;
  }

  function normalizeGridStatsType(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'species') {
      return 'species';
    }

    if (normalized === 'records') {
      return 'records';
    }

    if (normalized === 'rarity') {
      return 'rarity';
    }

    return 'switch';
  }

  function resolveSelectedMapTypeKey(mapElement, gridStatsType) {
    if (gridStatsType === 'species') {
      mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_SPECIES_KEY;
      return GRID_STATS_SPECIES_KEY;
    }

    if (gridStatsType === 'records') {
      mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_RECORDS_KEY;
      return GRID_STATS_RECORDS_KEY;
    }

    if (gridStatsType === 'rarity') {
      mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_RARITY_KEY;
      return GRID_STATS_RARITY_KEY;
    }

    const saved = mapElement?.dataset?.tanvisGridStatsSelectedMapTypeKey;
    if (saved === GRID_STATS_SPECIES_KEY || saved === GRID_STATS_RECORDS_KEY || saved === GRID_STATS_RARITY_KEY) {
      return saved;
    }

    mapElement.dataset.tanvisGridStatsSelectedMapTypeKey = GRID_STATS_RECORDS_KEY;
    return GRID_STATS_RECORDS_KEY;
  }

  async function buildGridStatsMapRecords({ apiBase, geographicRegionIdentifier }) {
    const gridSquareStatsRows = await fetchGridSquareStats({
      apiBase,
      geographicRegionIdentifier,
    });

    return gridSquareStatsRows;
  }

  async function fetchGridSquareStats({ apiBase, geographicRegionIdentifier }) {
    const resourceUrl = resolveResourceUrl$2(apiBase, GRID_SQUARE_STATS_RESOURCE);
    const rows = [];
    let offset = 0;

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('include', 'geographic-region');
      if (Number.isFinite(geographicRegionIdentifier)) {
        pageUrl.searchParams.set('higher_geography_identifier[in]', String(geographicRegionIdentifier));
      }
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$2));
      pageUrl.searchParams.set('offset', String(offset));

      const payload = await fetchJson$4(pageUrl.toString(), 'Failed to load grid-square-stats');
      const pageRows = getListData$1(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$2) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$2;
    }

    return rows;
  }

  function resolveResourceUrl$2(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$4(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData$1(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function areaToGeographicRegionIdentifier(area) {
    const normalizedArea = normalizeAreaContractValue(area);

    if (normalizedArea === 58) {
      return 58;
    }

    if (normalizedArea === 59) {
      return 59;
    }

    if (normalizedArea === 60) {
      return 60;
    }

    return undefined;
  }

  function getEffectiveArea$1(config) {
    if (!config.control) {
      return normalizeAreaContractValue(config.area);
    }

    if (typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (controlElement && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea') && normalizedControlAreaValue !== undefined && normalizedControlAreaValue !== null && normalizedControlAreaValue !== '') {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  function clearControlSubscription$1(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
  }

  function getDotStyleOptions(config = {}, hostElement) {
    if (!hostElement || typeof hostElement.dataset !== 'object') {
      return {
        dotColour: config.dotColour || '',
        transformation: config.transformation || '',
        shape: config.dotShape || 'circle'
      };
    }

    return {
      dotColour: config.dotColour ?? hostElement.dataset.visDotColour ?? '',
      transformation: config.transformation ?? hostElement.dataset.visTransformation ?? '',
      shape: config.dotShape ?? hostElement.dataset.visDotShape ?? 'circle'
    };
  }

  function createRecordNumberData(opacity = 1, options = {}) {
    return new Promise(function (resolve) {
      
      let recs = mapData.filter(r => r.occurrences_count !== 0).map(function (r) {
        return {
          gr: r.square,
          id: r.square,
          val: r.occurrences_count,
          caption: `${r.square}: ${r.occurrences_count || 0} records`
        };
      });
      const { dotColour = '', transformation = '', shape = 'circle' } = options || {};
      const resolvedTransform = transformation || '';
      const resolvedColourScale = dotColour || 'black';
      recs = resolveColours(recs, resolvedTransform, resolvedColourScale);
      resolve({ records: recs, size: 1, precision: 2000, shape, opacity });
    });
  }

  function createSpeciesNumberData(opacity = 1, options = {}) {
    return new Promise(function (resolve) {

      let recs = mapData.filter(r => r.species_count !== 0).map(function (r) {
        return {
          gr: r.square,
          id: r.square,
          val: r.species_count,
          caption: `${r.square}: ${r.species_count || 0} species`
        };
      });
      const { dotColour = '', transformation = '', shape = 'circle' } = options || {};
      const resolvedTransform = transformation || '';
      const resolvedColourScale = dotColour || 'black';
      recs = resolveColours(recs, resolvedTransform, resolvedColourScale);
      resolve({ records: recs, size: 1, precision: 2000, shape, opacity });
    });
  }

  function createRarityNumberData(opacity = 1, options = {}) {
    return new Promise(function (resolve) {

      let recs = mapData.filter(r => r.rarity_score != 0).map(function (r) {
        return {
          gr: r.square,
          id: r.square,
          val: r.rarity_score,
          caption: `${r.square}: ${r.rarity_score || 0} rarity score`
        };
      });
      const { dotColour = '', transformation = '', shape = 'circle' } = options || {};
      const resolvedTransform = transformation || '';
      const resolvedColourScale = dotColour || 'black';
      recs = resolveColours(recs, resolvedTransform, resolvedColourScale);
      resolve({ records: recs, size: 1, precision: 2000, shape, opacity });
    });
  }

  const gridStatsMapAdapter = createGridStatsMapAdapter();

  function renderGridStatsMap(element, config) {
    gridStatsMapAdapter.render(element, config);
  }

  // Adapter for Tanvis temporal year charts backed by BRC Charts.
  // Keeps all dependency checks and data-loading in one place.

  const TAXON_YEAR_STATS_RESOURCE = 'taxon-year-stats';
  const DEFAULT_PAGE_LIMIT$1 = 10000;

  let temporalYearChartIdCounter = 0;

  function createTemporalYearChartAdapter() {
    return {
      name: 'temporal-year-chart',
      render(element, config) {
        clearTaxonIdSourceSubscription$3(element);
        clearControlSubscriptions(element);
        const renderConfig = { ...config };

        // Remember the currently selected area across taxon changes and
        // stats-type toggles, since renderConfig itself is captured once
        // at render time and would otherwise go stale.
        element.__tanvisTemporalYearActiveArea = renderConfig.area;

        if (renderConfig.control) {
          const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || event.type !== 'area-change') {
              return;
            }

            const nextArea = event.area === undefined || event.area === null
              ? renderConfig.area
              : event.area;
            const currentArea = normalizeAreaContractValue(element.__tanvisTemporalYearActiveArea ?? renderConfig.area);

            if (nextArea === currentArea) {
              return;
            }

            element.dataset.visArea = nextArea === '' ? '' : String(nextArea ?? '');
            updateTemporalYearChartForSpecies(element, {
              ...renderConfig,
              area: nextArea,
              taxonId: element.dataset.visTaxonid || renderConfig.taxonId
            });
          });

          element.__tanvisControlCleanup = () => {
            controlBusCleanup?.();
          };
          element.__tanvisControlId = renderConfig.control;
        }

        if (renderConfig.taxonIdSource) {
          element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource$3(renderConfig.taxonIdSource, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visTaxonid) {
              return;
            }

            updateTemporalYearChartForSpecies(element, {
              ...renderConfig,
              area: element.__tanvisTemporalYearActiveArea ?? renderConfig.area,
              taxonId: speciesId
            });
          });
        }

        const loadId = (element.__tanvisTemporalYearLoadId || 0) + 1;
        element.__tanvisTemporalYearLoadId = loadId;
        element.dataset.visTaxonid = renderConfig.taxonId || '';
        const status = createVisStatusReporter(element);
        clearElement(element);
        status.showInfo('Loading...');

        loadTemporalYearChart(element, renderConfig, status)
          .then(() => {
            if (element.__tanvisTemporalYearLoadId !== loadId) {
              return;
            }

            if (element.__tanvisTemporalYearChartHasStylesheet !== false) {
              status.clear();
            }
          })
          .catch((error) => {
            if (element.__tanvisTemporalYearLoadId !== loadId) {
              return;
            }

            clearElement(element);
            status.showError(normalizeErrorMessage(error, 'Failed to render temporal year chart'));
          });
      }
    };
  }

  function subscribeToTaxonIdSource$3(taxonIdSourceId, onSpeciesSelected) {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
    if (!taxonIdSourceElement) {
      return undefined;
    }

    const onRowSelected = (event) => {
      const speciesId = event?.detail?.speciesId;
      if (typeof speciesId !== 'string' || !speciesId.trim()) {
        return;
      }

      onSpeciesSelected(speciesId.trim());
    };

    taxonIdSourceElement.addEventListener('taxon-identified', onRowSelected);
    return () => {
      taxonIdSourceElement.removeEventListener('taxon-identified', onRowSelected);
    };
  }

  function clearTaxonIdSourceSubscription$3(element) {
    const cleanup = element?.__tanvisTaxonIdSourceCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisTaxonIdSourceCleanup;
  }

  function clearControlSubscriptions(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
    delete element.__tanvisControlId;
  }

  async function updateTemporalYearChartForSpecies(element, config) {
    const chartInstance = element.__tanvisTemporalYearChartInstance;

    element.__tanvisTemporalYearActiveArea = config.area;

    if (!chartInstance || typeof chartInstance.setChartOpts !== 'function') {
      return createTemporalYearChartAdapter().render(element, config);
    }

    const normalizedStartYear = normalizeYearValue(config.startYear);
    const normalizedEndYear = normalizeYearValue(config.endYear);
    const chartRecords = await fetchTaxonYearStats({
      apiBase: resolveApiBase(),
      taxonIdentifier: config.taxonId,
      startYear: normalizedStartYear,
      endYear: normalizedEndYear,
      area: config.area
    });

    const temporalStatsType = resolveActiveTemporalStatsType(element, config);
    const metric = resolveTemporalMetric(temporalStatsType, config);
    const chartContainer = element.querySelector('[data-tanvis-temporal-year-chart="chart"]');
    const chartOptions = createTemporalYearChartOptions({
      config,
      chartContainer,
      chartRecords,
      temporalStatsType,
      startYear: normalizedStartYear,
      endYear: normalizedEndYear
    });

    element.dataset.visTaxonid = config.taxonId || '';
    setTemporalStatsTypeState(element, temporalStatsType);
    element.__tanvisTemporalYearLoadId = (element.__tanvisTemporalYearLoadId || 0) + 1;
    element.__tanvisTemporalYearLatest = { config, chartRecords };

    const transformedData = transformTemporalYearChartData(chartRecords);

    console.log('Switch taxon', metric, transformedData);

    chartInstance.setChartOpts({
      ...chartOptions,
      metrics: [metric],
      data: transformedData
    });
  }

  async function loadTemporalYearChart(element, config, status) {

    console.log('Loading temporal year chart');

    // If not taxonId is provided, we cannot load any data, 
    // so we just return early without rendering anything.
    if (!config.taxonId) return;

    const brcCharts = getBrcChartsGlobal();

    if (!brcCharts) {
      throw new Error('BRC Charts is not available. Include brccharts.umd.js before Tanvis.');
    }

    if (!getD3Global()) {
      throw new Error('D3 is not available. Include d3.v7.min.js and brccharts.umd.js before using the Tanvis temporal year chart.');
    }

    const hasStylesheet = ensureStylesheetDependency(status, {
      libraryName: 'BRC Charts',
      stylesheetHints: ['brccharts.umd.css'],
      message: 'BRC Charts stylesheet is missing. Include brccharts.umd.css to ensure the chart is styled correctly.'
    });

    element.__tanvisTemporalYearChartHasStylesheet = hasStylesheet;

    if (typeof brcCharts.temporal !== 'function') {
      throw new Error('BRC Charts temporal chart is not available. Include a compatible brccharts.umd.js bundle.');
    }

    ensureSharedStyles();

    const normalizedStartYear = normalizeYearValue(config.startYear);
    const normalizedEndYear = normalizeYearValue(config.endYear);
    const chartRecords = await fetchTaxonYearStats({
      apiBase: resolveApiBase(),
      taxonIdentifier: config.taxonId,
      startYear: normalizedStartYear,
      endYear: normalizedEndYear,
      area: config.area
    });

    const chartContainer = createTemporalYearChartContainer(element);
    const initialStatsType = resolveTemporalStatsType(config.temporalStatsType);
    setTemporalStatsTypeState(element, initialStatsType);
    const chartOptions = createTemporalYearChartOptions({
      config,
      chartContainer,
      chartRecords,
      temporalStatsType: initialStatsType,
      startYear: normalizedStartYear,
      endYear: normalizedEndYear
    });

    const statusElement = element.__tanvisVisStatusElement;
    clearElement(element);

    if (statusElement && statusElement.parentNode !== element) {
      element.appendChild(statusElement);
    }

    element.appendChild(chartContainer);

    const chartInstance = brcCharts.temporal(chartOptions);
    element.__tanvisTemporalYearChartInstance = chartInstance;
    element.__tanvisTemporalYearLatest = { config, chartRecords };

    if (config.temporalStatsType === 'switch') {
      element.appendChild(createTemporalStatsTypeSwitchControl({
        chartElement: element,
        selectedValue: initialStatsType,
        chartInstance,
        config,
        chartRecords
      }));
    }

    if (config.temporalStatsType === 'records' || config.temporalStatsType === 'squares') {
      element.dataset.tanvisTemporalStatsType = initialStatsType;
    }
  }

  async function fetchTaxonYearStats({ apiBase, taxonIdentifier, startYear, endYear, area }) {
    const resourceUrl = resolveResourceUrl$1(apiBase, TAXON_YEAR_STATS_RESOURCE);
    const rows = [];
    let offset = 0;

    if (!taxonIdentifier) {
      return rows;
    }

    while (true) {
      const pageUrl = new URL(resourceUrl.toString());
      pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);
      pageUrl.searchParams.set('year[gte]', String(startYear));
      pageUrl.searchParams.set('year[lte]', String(endYear));
      pageUrl.searchParams.set('higher_geography_identifier[eq]', area ? area : 'null');
      pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT$1));
      pageUrl.searchParams.set('offset', String(offset));
   
      const payload = await fetchJson$3(pageUrl.toString(), 'Failed to load taxon-year-stats');

      console.log('Fetched taxon-year-stats page', offset, payload);

      const pageRows = getListData(payload);
      rows.push(...pageRows);

      if (pageRows.length < DEFAULT_PAGE_LIMIT$1) {
        break;
      }

      offset += DEFAULT_PAGE_LIMIT$1;
    }

    return rows;
  }

  function createTemporalYearChartContainer(element) {
    const container = document.createElement('div');
    container.dataset.tanvisTemporalYearChart = 'chart';

    if (!element.id) {
      temporalYearChartIdCounter += 1;
      element.id = `tanvis-temporal-year-chart-${temporalYearChartIdCounter}`;
    }

    container.id = `${element.id}__chart`;
    return container;
  }

  function createTemporalStatsTypeSwitchControl({ chartElement, selectedValue = 'records', chartInstance, config, chartRecords }) {
    const group = createRadioGroup({
      name: `${chartElement.id || 'tanvis-temporal-year-chart'}-temporal-stats-switch`,
      selectedValue,
      items: [
        { value: 'records', label: 'Records' },
        { value: 'squares', label: 'Squares' }
      ],
      onChange: (value) => {
        if (!chartInstance || typeof chartInstance.setChartOpts !== 'function') {
          return;
        }

        // Pull the latest config/data instead of the values captured when the
        // control was created, since the selected area or taxon may have
        // changed since then.
        const latest = chartElement.__tanvisTemporalYearLatest || { config, chartRecords };
        const temporalStatsType = resolveTemporalStatsType(value);
        const metric = resolveTemporalMetric(temporalStatsType, latest.config);

        console.log('Switch control', metric);

        chartInstance.setChartOpts({
          metrics: [metric],
          data: transformTemporalYearChartData(latest.chartRecords, temporalStatsType)
        });

        setTemporalStatsTypeState(chartElement, temporalStatsType);
      }
    });

    group.classList.add('tanvis-temporal-year-chart-switch', 'tanvis-grid-stats-switch');
    return group;
  }

  function createTemporalYearChartOptions({ config, chartContainer, chartRecords, temporalStatsType, startYear, endYear }) {
    const metric = resolveTemporalMetric(temporalStatsType, config);

    return {
      selector: `#${chartContainer.id}`,
      data: transformTemporalYearChartData(chartRecords, temporalStatsType),
      metrics: [metric],
      periodType: 'year',
      chartStyle: config.chartType,
      lineInterpolator: 'curveMonotoneX',
      showLegend: true,
      interactivity: 'mousemove',
      minY: 0,
      perRow: 1,
      ...(Number.isFinite(startYear) ? { minPeriod: startYear } : {}),
      ...(Number.isFinite(endYear) ? { maxPeriod: endYear } : {}),
      ...(config.expand !== undefined ? { expand: config.expand } : {}),
      ...(config.width !== undefined ? { width: config.width } : {}),
      ...(config.height !== undefined ? { height: config.height } : {})
    };
  }

  function normalizeYearValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  function resolveTemporalStatsType(value) {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'squares') {
      return 'squares';
    }

    if (normalized === 'records') {
      return 'records';
    }

    return 'records';
  }

  function resolveActiveTemporalStatsType(element, config) {
    const selectedControlValue = getSelectedTemporalStatsTypeFromControl(element);
    if (selectedControlValue === 'records' || selectedControlValue === 'squares') {
      return selectedControlValue;
    }

    const hostValue = resolveTemporalStatsType(element?.__tanvisTemporalYearActiveStatsType);
    if (hostValue === 'records' || hostValue === 'squares') {
      return hostValue;
    }

    const datasetValue = resolveTemporalStatsType(element?.dataset?.tanvisTemporalStatsType);
    if (datasetValue === 'records' || datasetValue === 'squares') {
      return datasetValue;
    }

    return resolveTemporalStatsType(config.temporalStatsType);
  }

  function getSelectedTemporalStatsTypeFromControl(element) {
    if (!element) {
      return null;
    }

    const checkedInput = element.querySelector('.tanvis-temporal-year-chart-switch input[type="radio"]:checked');
    if (!checkedInput) {
      return null;
    }

    return resolveTemporalStatsType(checkedInput.value);
  }

  function setTemporalStatsTypeState(element, temporalStatsType) {
    const normalized = resolveTemporalStatsType(temporalStatsType);

    if (element) {
      element.dataset.tanvisTemporalStatsType = normalized;
      element.__tanvisTemporalYearActiveStatsType = normalized;
    }

    return normalized;
  }

  function resolveTemporalMetric(temporalStatsType, config) {
    const areaLabel = formatTemporalAreaLabel(config?.area);
    if (temporalStatsType === 'squares') {
      return { prop: 'count', label: `Grid squares (${areaLabel})`, colour: config.squaresColour };
    }

    return { prop: 'count', label: `Records (${areaLabel})`, colour: config.recordsColour };
  }

  function formatTemporalAreaLabel(area) {
    if (area === undefined || area === null || area === '') {
      return 'all VCs';
    }

    const normalized = String(area).trim();
    if (/^vc\d+$/i.test(normalized)) {
      return normalized.toLowerCase();
    }

    return `vc${normalized}`;
  }

  function transformTemporalYearChartData(chartRecords, temporalStatsType = 'records') {
    const normalizedStatsType = resolveTemporalStatsType(temporalStatsType);

    return chartRecords.map((row) => ({
      period: Number(row.year),
      count: Number(normalizedStatsType === 'squares'
        ? (row.grid_square_count || 0)
        : (row.occurrences_count || 0))
    }));
  }

  function resolveResourceUrl$1(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$3(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getListData(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.records)) {
      return payload.records;
    }

    return [];
  }

  function getBrcChartsGlobal() {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.brccharts || null;
  }

  function getD3Global() {
    // Resolve D3 from the same global context used in tests so the adapter
    // behaves consistently in both the browser and Vitest.
    if (typeof window === 'undefined' && typeof globalThis === 'undefined') {
      return null;
    }

    return globalThis.d3 || window?.d3 || null;
  }

  const temporalYearChartAdapter = createTemporalYearChartAdapter();

  function renderTemporalYearChart(element, config) {
    temporalYearChartAdapter.render(element, config);
  }

  const TAXA_RESOURCE$1 = 'taxa';
  const DEFAULT_PLACEHOLDER_TEXT$1 = 'Species name';

  function createSpeciesNameBlockAdapter() {
    return {
      name: 'species-name-block',
      render(element, config) {
        const taxonIdSourceId = config.taxonIdSource || '';
        const shouldPreserveTaxonIdSourceSubscription = Boolean(
          element.__tanvisTaxonIdSourceCleanup
          && element.__tanvisTaxonIdSourceId === taxonIdSourceId
        );

        if (!shouldPreserveTaxonIdSourceSubscription) {
          clearTaxonIdSourceSubscription$2(element);
        }

        if (config.taxonIdSource && !shouldPreserveTaxonIdSourceSubscription) {
          element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource$2(taxonIdSourceId, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visTaxonid) {
              return;
            }

            element.dataset.visTaxonid = speciesId;
            createSpeciesNameBlockAdapter().render(element, {
              ...config,
              taxonId: speciesId
            });
          });
          element.__tanvisTaxonIdSourceId = taxonIdSourceId;
        }

        const status = createVisStatusReporter(element);
        const taxonIdentifier = resolveTaxonIdentifier$2(element, config);
        const content = ensureContentStructure$2(element);

        if (!taxonIdentifier) {
          status.clear();
          renderPlaceholder$1(content);
          return;
        }

        const loadId = (element.__tanvisSpeciesNameBlockLoadId || 0) + 1;
        element.__tanvisSpeciesNameBlockLoadId = loadId;
        element.dataset.visTaxonid = taxonIdentifier;

        fetchTaxon$1({
          apiBase: resolveApiBase(),
          taxonIdentifier
        })
          .then((taxon) => {
            if (element.__tanvisSpeciesNameBlockLoadId !== loadId) {
              return;
            }

            renderSpeciesNameBlockContent(content, taxon, config);
            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisSpeciesNameBlockLoadId !== loadId) {
              return;
            }

            status.showError(normalizeErrorMessage(error, 'Failed to load taxon details'));
          });
      }
    };
  }

  function resolveTaxonIdentifier$2(element, config) {
    const fromDataset = normalizeValue$2(element?.dataset?.visTaxonid);
    if (fromDataset) {
      return fromDataset;
    }

    return normalizeValue$2(config?.taxonId);
  }

  function normalizeValue$2(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  function subscribeToTaxonIdSource$2(taxonIdSourceId, onSpeciesSelected) {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
    if (!taxonIdSourceElement) {
      return undefined;
    }

    const onTaxonIdentified = (event) => {
      const speciesId = event?.detail?.speciesId;
      if (typeof speciesId !== 'string' || !speciesId.trim()) {
        return;
      }

      onSpeciesSelected(speciesId.trim());
    };

    taxonIdSourceElement.addEventListener('taxon-identified', onTaxonIdentified);
    return () => {
      taxonIdSourceElement.removeEventListener('taxon-identified', onTaxonIdentified);
    };
  }

  function clearTaxonIdSourceSubscription$2(element) {
    const cleanup = element?.__tanvisTaxonIdSourceCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisTaxonIdSourceCleanup;
    delete element.__tanvisTaxonIdSourceId;
  }

  async function fetchTaxon$1({ apiBase, taxonIdentifier }) {
    const taxonUrl = resolveTaxonUrl$1(apiBase, taxonIdentifier);
    const payload = await fetchJson$2(taxonUrl.toString(), 'Failed to load taxon details');
    return getTaxonRecord$1(payload);
  }

  function resolveTaxonUrl$1(apiBase, taxonIdentifier) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${TAXA_RESOURCE$1}/${encodeURIComponent(taxonIdentifier)}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$2(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getTaxonRecord$1(payload) {
    if (payload && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data[0] || {};
    }

    if (Array.isArray(payload)) {
      return payload[0] || {};
    }

    if (payload && typeof payload === 'object') {
      return payload;
    }

    return {};
  }

  function ensureContentStructure$2(element) {
    if (element.__tanvisSpeciesNameBlockContent?.isConnected) {
      return element.__tanvisSpeciesNameBlockContent;
    }

    clearElement(element);

    const doc = element?.ownerDocument || document;
    const content = doc.createElement('span');
    content.dataset.tanvisSpeciesNameBlock = 'content';

    const placeholder = doc.createElement('span');
    placeholder.dataset.tanvisSpeciesNameBlock = 'placeholder';

    const primary = doc.createElement('span');
    primary.dataset.tanvisSpeciesNameBlock = 'primary';
    const primaryText = doc.createElement('span');
    const primaryScientific = doc.createElement('em');
    const primaryAuthority = doc.createTextNode('');
    primary.append(primaryText, primaryScientific, primaryAuthority);

    const secondaryWrapper = doc.createElement('span');
    secondaryWrapper.dataset.tanvisSpeciesNameBlock = 'secondary';
    const secondaryText = doc.createElement('span');
    const secondaryScientific = doc.createElement('em');
    const secondaryAuthority = doc.createTextNode('');
    const secondaryOpen = doc.createTextNode(' (');
    const secondaryClose = doc.createTextNode(')');
    secondaryWrapper.append(secondaryOpen, secondaryText, secondaryScientific, secondaryAuthority, secondaryClose);

    content.append(placeholder, primary, secondaryWrapper);
    element.appendChild(content);

    content.__tanvisSpeciesNameBlockNodes = {
      placeholder,
      primary,
      primaryText,
      primaryScientific,
      primaryAuthority,
      secondaryWrapper,
      secondaryOpen,
      secondaryText,
      secondaryScientific,
      secondaryAuthority,
      secondaryClose
    };

    element.__tanvisSpeciesNameBlockContent = content;
    return content;
  }

  function renderPlaceholder$1(content) {
    const nodes = content.__tanvisSpeciesNameBlockNodes;
    resetNameContent(nodes);
    nodes.placeholder.textContent = DEFAULT_PLACEHOLDER_TEXT$1;
    // Keep the placeholder text in the DOM (visibility hidden) so the block retains its layout space.
    nodes.placeholder.hidden = false;
    nodes.placeholder.style.visibility = 'hidden';
    nodes.primary.hidden = true;
    nodes.secondaryWrapper.hidden = true;
  }

  function renderSpeciesNameBlockContent(content, taxon, config) {
    const nodes = content.__tanvisSpeciesNameBlockNodes;
    resetNameContent(nodes);

    const hasPrimaryName = setNameContent(nodes.primaryText, nodes.primaryScientific, nodes.primaryAuthority, taxon, config?.primaryName, config?.authority === true);
    const secondaryNameType = normalizeValue$2(config?.secondaryName);

    nodes.placeholder.hidden = true;
    nodes.primary.hidden = !hasPrimaryName;

    let hasSecondaryName = false;
    if (secondaryNameType && secondaryNameType !== 'none') {
      hasSecondaryName = setNameContent(nodes.secondaryText, nodes.secondaryScientific, nodes.secondaryAuthority, taxon, secondaryNameType, config?.authority === true);

      if (hasSecondaryName && !hasPrimaryName) {
        nodes.secondaryOpen.textContent = '(';
      } else {
        nodes.secondaryOpen.textContent = ' (';
      }

      if (hasSecondaryName) {
        nodes.secondaryClose.textContent = ')';
      }
    }

    nodes.secondaryWrapper.hidden = !hasSecondaryName;

    if (!hasPrimaryName && !hasSecondaryName) {
      renderPlaceholder$1(content);
    }
  }

  function resetNameContent(nodes) {
    nodes.placeholder.textContent = '';
    nodes.primaryText.textContent = '';
    nodes.primaryScientific.textContent = '';
    nodes.primaryAuthority.textContent = '';
    nodes.secondaryText.textContent = '';
    nodes.secondaryScientific.textContent = '';
    nodes.secondaryAuthority.textContent = '';
    nodes.placeholder.hidden = true;
    nodes.placeholder.style.visibility = '';
    nodes.secondaryOpen.textContent = '';
    nodes.secondaryClose.textContent = '';
  }

  function setNameContent(textElement, scientificElement, authorityTextNode, taxon, nameType, includeAuthority) {
    if (nameType === 'scientific') {
      const scientificName = normalizeValue$2(taxon?.scientific_name);
      if (!scientificName) {
        return false;
      }

      textElement.hidden = true;
      scientificElement.hidden = false;
      scientificElement.textContent = scientificName;

      if (includeAuthority) {
        const authorship = normalizeValue$2(taxon?.scientific_name_authorship);
        if (authorship) {
          authorityTextNode.textContent = ` ${authorship}`;
        }
      }

      return true;
    }

    if (nameType === 'vernacular') {
      const vernacularName = normalizeValue$2(taxon?.vernacular_name);
      if (!vernacularName) {
        return false;
      }

      scientificElement.hidden = true;
      textElement.hidden = false;
      textElement.textContent = vernacularName;
      return true;
    }

    return false;
  }

  const speciesNameBlockAdapter = createSpeciesNameBlockAdapter();

  function renderSpeciesNameBlock(element, config) {
    speciesNameBlockAdapter.render(element, config);
  }

  const TAXA_RESOURCE = 'taxa';
  const DEFAULT_PLACEHOLDER_TEXT = 'No species remarks available.';

  function createSpeciesRemarksBlockAdapter() {
    return {
      name: 'species-remarks-block',
      render(element, config) {
        const taxonIdSourceId = config.taxonIdSource || '';
        const shouldPreserveTaxonIdSourceSubscription = Boolean(
          element.__tanvisTaxonIdSourceCleanup
          && element.__tanvisTaxonIdSourceId === taxonIdSourceId
        );

        if (!shouldPreserveTaxonIdSourceSubscription) {
          clearTaxonIdSourceSubscription$1(element);
        }

        if (config.taxonIdSource && !shouldPreserveTaxonIdSourceSubscription) {
          element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource$1(taxonIdSourceId, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visTaxonid) {
              return;
            }

            element.dataset.visTaxonid = speciesId;
            createSpeciesRemarksBlockAdapter().render(element, {
              ...config,
              taxonId: speciesId
            });
          });
          element.__tanvisTaxonIdSourceId = taxonIdSourceId;
        }

        const status = createVisStatusReporter(element);
        const taxonIdentifier = resolveTaxonIdentifier$1(element, config);
        const content = ensureContentStructure$1(element);

        if (!taxonIdentifier) {
          status.clear();
          renderPlaceholder(content);
          return;
        }

        const loadId = (element.__tanvisSpeciesRemarksBlockLoadId || 0) + 1;
        element.__tanvisSpeciesRemarksBlockLoadId = loadId;
        element.dataset.visTaxonid = taxonIdentifier;

        fetchTaxon({
          apiBase: resolveApiBase(),
          taxonIdentifier
        })
          .then((taxon) => {
            if (element.__tanvisSpeciesRemarksBlockLoadId !== loadId) {
              return;
            }

            renderSpeciesRemarksBlockContent(content, taxon);
            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisSpeciesRemarksBlockLoadId !== loadId) {
              return;
            }

            status.showError(normalizeErrorMessage(error, 'Failed to load taxon details'));
          });
      }
    };
  }

  function resolveTaxonIdentifier$1(element, config) {
    const fromDataset = normalizeValue$1(element?.dataset?.visTaxonid);
    if (fromDataset) {
      return fromDataset;
    }

    return normalizeValue$1(config?.taxonId);
  }

  function normalizeValue$1(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  function subscribeToTaxonIdSource$1(taxonIdSourceId, onSpeciesSelected) {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
    if (!taxonIdSourceElement) {
      return undefined;
    }

    const onTaxonIdentified = (event) => {
      const speciesId = event?.detail?.speciesId;
      if (typeof speciesId !== 'string' || !speciesId.trim()) {
        return;
      }

      onSpeciesSelected(speciesId.trim());
    };

    taxonIdSourceElement.addEventListener('taxon-identified', onTaxonIdentified);
    return () => {
      taxonIdSourceElement.removeEventListener('taxon-identified', onTaxonIdentified);
    };
  }

  function clearTaxonIdSourceSubscription$1(element) {
    const cleanup = element?.__tanvisTaxonIdSourceCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisTaxonIdSourceCleanup;
    delete element.__tanvisTaxonIdSourceId;
  }

  async function fetchTaxon({ apiBase, taxonIdentifier }) {
    const taxonUrl = resolveTaxonUrl(apiBase, taxonIdentifier);
    const payload = await fetchJson$1(taxonUrl.toString(), 'Failed to load taxon details');
    return getTaxonRecord(payload);
  }

  function resolveTaxonUrl(apiBase, taxonIdentifier) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${TAXA_RESOURCE}/${encodeURIComponent(taxonIdentifier)}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson$1(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getTaxonRecord(payload) {
    if (payload && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
      return payload.data;
    }

    if (Array.isArray(payload?.data)) {
      return payload.data[0] || {};
    }

    if (Array.isArray(payload)) {
      return payload[0] || {};
    }

    if (payload && typeof payload === 'object') {
      return payload;
    }

    return {};
  }

  function ensureContentStructure$1(element) {
    if (element.__tanvisSpeciesRemarksBlockContent?.isConnected) {
      return element.__tanvisSpeciesRemarksBlockContent;
    }

    clearElement(element);

    const doc = element?.ownerDocument || document;
    const content = doc.createElement('span');
    content.dataset.tanvisSpeciesRemarksBlock = 'content';
    element.appendChild(content);

    element.__tanvisSpeciesRemarksBlockContent = content;
    return content;
  }

  function renderPlaceholder(content) {
    content.textContent = DEFAULT_PLACEHOLDER_TEXT;
  }

  function renderSpeciesRemarksBlockContent(content, taxon) {
    const remarks = normalizeValue$1(taxon?.taxon_remarks);

    if (!remarks) {
      renderPlaceholder(content);
      return;
    }

    content.textContent = remarks;
  }

  const speciesRemarksBlockAdapter = createSpeciesRemarksBlockAdapter();

  function renderSpeciesRemarksBlock(element, config) {
    speciesRemarksBlockAdapter.render(element, config);
  }

  const TAXON_STATS_RESOURCE = 'taxon-stats';
  const DEFAULT_PAGE_LIMIT = 10000;

  function createSpeciesInfoBlockAdapter() {
    return {
      name: 'species-info-block',
      render(element, config) {
        const effectiveArea = getEffectiveArea(config);
        const renderConfig = {
          ...config,
          area: normalizeAreaContractValue(effectiveArea)
        };

        const taxonIdSourceId = renderConfig.taxonIdSource || '';
        const shouldPreserveTaxonIdSourceSubscription = Boolean(
          element.__tanvisTaxonIdSourceCleanup
          && element.__tanvisTaxonIdSourceId === taxonIdSourceId
        );
        const shouldPreserveControlSubscription = Boolean(
          element.__tanvisControlCleanup
          && element.__tanvisControlId === renderConfig.control
        );

        if (!shouldPreserveTaxonIdSourceSubscription) {
          clearTaxonIdSourceSubscription(element);
        }
        if (!shouldPreserveControlSubscription) {
          clearControlSubscription(element);
        }

        if (renderConfig.control && !shouldPreserveControlSubscription) {
          const controlBusCleanup = subscribeToControl(renderConfig.control, (event) => {
            if (!event || event.type !== 'area-change') {
              return;
            }

            const nextArea = normalizeAreaContractValue(
              event.area === undefined || event.area === null ? renderConfig.area : event.area
            );
            const currentArea = normalizeAreaContractValue(element.dataset.visArea);
            if (nextArea === currentArea) {
              return;
            }

            element.dataset.visArea = normalizeAreaDatasetValue(nextArea);
            createSpeciesInfoBlockAdapter().render(element, {
              ...renderConfig,
              area: nextArea,
              taxonId: element.dataset.visTaxonid || renderConfig.taxonId
            });
          });

          element.__tanvisControlCleanup = () => {
            controlBusCleanup?.();
          };
          element.__tanvisControlId = renderConfig.control;
        }

        if (renderConfig.taxonIdSource && !shouldPreserveTaxonIdSourceSubscription) {
          element.__tanvisTaxonIdSourceCleanup = subscribeToTaxonIdSource(taxonIdSourceId, (speciesId) => {
            if (!speciesId || speciesId === element.dataset.visTaxonid) {
              return;
            }

            element.dataset.visTaxonid = speciesId;
            createSpeciesInfoBlockAdapter().render(element, {
              ...renderConfig,
              taxonId: speciesId
            });
          });
          element.__tanvisTaxonIdSourceId = taxonIdSourceId;
        }

        const status = createVisStatusReporter(element);
        const taxonIdentifier = resolveTaxonIdentifier(element, renderConfig);
        const content = ensureContentStructure(element);

        element.dataset.visArea = normalizeAreaDatasetValue(renderConfig.area);

        if (!taxonIdentifier) {
          status.clear();
          renderSpeciesInfoText(content, [], renderConfig.area);
          return;
        }

        const loadId = (element.__tanvisSpeciesInfoBlockLoadId || 0) + 1;
        element.__tanvisSpeciesInfoBlockLoadId = loadId;
        element.dataset.visTaxonid = taxonIdentifier;

        fetchTaxonStats({
          apiBase: resolveApiBase(),
          taxonIdentifier,
          area: renderConfig.area
        })
          .then((stats) => {
            if (element.__tanvisSpeciesInfoBlockLoadId !== loadId) {
              return;
            }

            renderSpeciesInfoText(content, stats, renderConfig.area);
            status.clear();
          })
          .catch((error) => {
            if (element.__tanvisSpeciesInfoBlockLoadId !== loadId) {
              return;
            }

            status.showError(normalizeErrorMessage(error, 'Failed to load taxon stats'));
          });
      }
    };
  }

  function resolveTaxonIdentifier(element, config) {
    const fromDataset = normalizeValue(element?.dataset?.visTaxonid);
    if (fromDataset) {
      return fromDataset;
    }

    return normalizeValue(config?.taxonId);
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  function normalizeAreaDatasetValue(area) {
    if (area === undefined || area === null) {
      return '';
    }

    return String(area);
  }

  function subscribeToTaxonIdSource(taxonIdSourceId, onSpeciesSelected) {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const taxonIdSourceElement = document.getElementById(taxonIdSourceId);
    if (!taxonIdSourceElement) {
      return undefined;
    }

    const onTaxonIdentified = (event) => {
      const speciesId = event?.detail?.speciesId;
      if (typeof speciesId !== 'string' || !speciesId.trim()) {
        return;
      }

      onSpeciesSelected(speciesId.trim());
    };

    taxonIdSourceElement.addEventListener('taxon-identified', onTaxonIdentified);
    return () => {
      taxonIdSourceElement.removeEventListener('taxon-identified', onTaxonIdentified);
    };
  }

  function clearTaxonIdSourceSubscription(element) {
    const cleanup = element?.__tanvisTaxonIdSourceCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisTaxonIdSourceCleanup;
    delete element.__tanvisTaxonIdSourceId;
  }

  function clearControlSubscription(element) {
    const cleanup = element?.__tanvisControlCleanup;
    if (typeof cleanup === 'function') {
      cleanup();
    }

    delete element.__tanvisControlCleanup;
    delete element.__tanvisControlId;
  }

  function getEffectiveArea(config) {
    if (!config.control || typeof document === 'undefined') {
      return normalizeAreaContractValue(config.area);
    }

    const controlElement = document.getElementById(config.control);
    const controlAreaValue = controlElement?.dataset?.visArea;
    const normalizedControlAreaValue = normalizeAreaContractValue(controlAreaValue);
    if (
      controlElement
      && Object.prototype.hasOwnProperty.call(controlElement.dataset, 'visArea')
      && normalizedControlAreaValue !== undefined
      && normalizedControlAreaValue !== null
      && normalizedControlAreaValue !== ''
    ) {
      return normalizedControlAreaValue;
    }

    const latestEvent = getLatestControlEvent(config.control);
    if (latestEvent?.type === 'area-change' && latestEvent.area !== undefined && latestEvent.area !== null) {
      return normalizeAreaContractValue(latestEvent.area);
    }

    return normalizeAreaContractValue(config.area);
  }

  async function fetchTaxonStats({ apiBase, taxonIdentifier, area }) {
    const resourceUrl = resolveResourceUrl(apiBase, TAXON_STATS_RESOURCE);
    const pageUrl = new URL(resourceUrl.toString());
    pageUrl.searchParams.set('taxon_identifier[eq]', taxonIdentifier);

    if (area) {
      pageUrl.searchParams.set('higher_geography_identifier[eq]', String(area));
    }

    pageUrl.searchParams.set('include', 'taxon');
    pageUrl.searchParams.set('limit', String(DEFAULT_PAGE_LIMIT));

    const payload = await fetchJson(pageUrl.toString(), 'Failed to load taxon-stats');
    return getRecords(payload);
  }

  function resolveResourceUrl(apiBase, resourceName) {
    const baseUrl = new URL(apiBase, window.location.origin);
    const pathname = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    baseUrl.pathname = `${pathname}${resourceName}`;
    baseUrl.search = '';
    baseUrl.hash = '';
    return baseUrl;
  }

  async function fetchJson(url, defaultErrorMessage) {
    logApiRequest(url, { method: 'GET' });

    let response;
    try {
      response = await fetch(url);
    } catch (cause) {
      throw createApiError({ defaultMessage: defaultErrorMessage, cause });
    }

    const payload = await parseJsonSafe(response);
    if (!response.ok) {
      throw createApiError({ response, payload, defaultMessage: defaultErrorMessage });
    }

    return payload || {};
  }

  function getRecords(payload) {
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
      return [payload.data];
    }

    if (payload && typeof payload === 'object') {
      return [payload];
    }

    return [];
  }

  function ensureContentStructure(element) {
    if (element.__tanvisSpeciesInfoBlockContent?.isConnected) {
      return element.__tanvisSpeciesInfoBlockContent;
    }

    clearElement(element);
    const doc = element?.ownerDocument || document;
    const content = doc.createElement('table');
    content.dataset.tanvisSpeciesInfoBlock = 'content';
    const body = doc.createElement('tbody');

    const conservationValueCell = appendInfoRow(doc, body, 'Status');
    const occurrencesValueCell = appendInfoRow(doc, body, 'Occurrences');
    const gridSquaresValueCell = appendInfoRow(doc, body, 'Tetrads');

    content.appendChild(body);
    element.appendChild(content);

    content.__tanvisSpeciesInfoBlockNodes = {
      conservationValueCell,
      occurrencesValueCell,
      gridSquaresValueCell
    };

    element.__tanvisSpeciesInfoBlockContent = content;
    return content;
  }

  function renderSpeciesInfoText(content, statsRows, area) {
    const nodes = content.__tanvisSpeciesInfoBlockNodes;
    const rows = Array.isArray(statsRows) ? statsRows : [];
    const sortedRows = sortStatsRowsForDisplay(rows, area);
    const firstRow = sortedRows[0] || {};

    renderCountCell(content, nodes.occurrencesValueCell, sortedRows, 'occurrences_count', area);
    renderCountCell(content, nodes.gridSquaresValueCell, sortedRows, 'grid_square_count', area);
    const conservationStatus = toDisplayStatus(firstRow?.taxon__conservation_status);

    renderItalicCell(nodes.conservationValueCell, content, conservationStatus);
  }

  function appendInfoRow(doc, body, labelText) {
    const row = doc.createElement('tr');
    const labelCell = doc.createElement('td');
    const valueCell = doc.createElement('td');

    labelCell.textContent = `${labelText}:`;
    labelCell.style.textAlign = 'right';

    row.appendChild(labelCell);
    row.appendChild(valueCell);
    body.appendChild(row);

    return valueCell;
  }

  function toDisplayNumber(value) {
    if (value === undefined || value === null || value === '') {
      return '0';
    }
    return String(value);
  }

  function renderCountCell(content, cell, rows, key, area) {
    clearElement(cell);
    const doc = content?.ownerDocument || document;

    const orderedRows = sortStatsRowsForDisplay(rows, area);
    if (orderedRows.length === 0) {
      appendCountEntry(cell, doc, '0', area ? formatVcLabel(area) : formatVcLabel(undefined));
      return;
    }

    orderedRows.forEach((row, index) => {
      if (index > 0) {
        cell.appendChild(doc.createTextNode(', '));
      }

      const count = toDisplayNumber(row?.[key]);
      const vcLabel = formatVcLabel(resolveRowVcValue(row));
      appendCountEntry(cell, doc, count, area ? formatVcLabel(area) : vcLabel);
    });
  }

  function appendCountEntry(cell, doc, count, label) {
    const strong = doc.createElement('strong');
    strong.textContent = String(count);
    cell.appendChild(strong);
    cell.appendChild(doc.createTextNode(` (${label})`));
  }

  function renderItalicCell(cell, content, value) {
    clearElement(cell);
    const doc = content?.ownerDocument || document;
    const emphasis = doc.createElement('em');
    emphasis.textContent = value;
    cell.appendChild(emphasis);
  }

  function sortStatsRowsForDisplay(rows, area) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    if (area) {
      return rows;
    }

    const preferredOrder = new Map([
      ['all', 0],
      ['vc58', 1],
      ['vc59', 2],
      ['vc60', 3]
    ]);

    return [...rows].sort((left, right) => {
      const leftKey = getRowSortKey(left);
      const rightKey = getRowSortKey(right);
      const leftOrder = preferredOrder.has(leftKey) ? preferredOrder.get(leftKey) : Number.POSITIVE_INFINITY;
      const rightOrder = preferredOrder.has(rightKey) ? preferredOrder.get(rightKey) : Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return 0;
    });
  }

  function getRowSortKey(row) {
    const vcValue = resolveRowVcValue(row);
    if (vcValue === undefined || vcValue === null || vcValue === '' || vcValue === 'null') {
      return 'all';
    }

    return `vc${String(vcValue).trim()}`.toLowerCase();
  }

  function formatVcLabel(vcValue) {
    if (vcValue === undefined || vcValue === null || vcValue === '' || vcValue === 'null') {
      return 'all VCs';
    }

    const normalized = String(vcValue).trim();
    if (/^vc\d+$/i.test(normalized)) {
      return normalized.toLowerCase();
    }

    return `vc${normalized}`;
  }

  function resolveRowVcValue(row) {
    if (!row || typeof row !== 'object') {
      return undefined;
    }

    if (row.geographic_region__higher_geography !== undefined) {
      return row.geographic_region__higher_geography;
    }

    if (row.geographic_region_identifier !== undefined) {
      return row.geographic_region_identifier;
    }

    if (row.higher_geography_identifier !== undefined) {
      return row.higher_geography_identifier;
    }

    return undefined;
  }

  function toDisplayStatus(value) {
    if (value === undefined || value === null || value === '') {
      return 'None specified';
    }
    switch(value) {
      case 'DD':
        return 'Data Deficient';
      case 'LC':
        return 'Least Concern';
      case 'NT':
        return 'Near Threatened';
      case 'VU':
        return 'Vulnerable';
      case 'EN':
        return 'Endangered';
      case 'CR':
        return 'Critically Endangered';
      case 'RE':
        return 'Regionally Extinct';
      case 'EW':
        return 'Extinct in the Wild';
      case 'EX':
        return 'Extinct';
      case 'NE':
        return 'Not Evaluated';
      case 'NR':
        return 'Nationally Rare';
      case 'NS':
        return 'Nationally Scarce';
      default:
        return String(value);
    }
  }

  const speciesInfoBlockAdapter = createSpeciesInfoBlockAdapter();

  function renderSpeciesInfoBlock(element, config) {
    speciesInfoBlockAdapter.render(element, config);
  }

  // Adapter for the help-block visualisation, which documents the data
  // attributes supported by every known Tanvis visualisation type.

  function createHelpBlockAdapter() {
    return {
      name: 'help-block',
      render(element, config) {
        ensureSharedStyles();
        clearElement(element);

        getKnownVisTypes().forEach((visType) => {
          element.appendChild(createVisTypeSection(visType));
        });
      }
    };
  }

  function createVisTypeSection(visType) {
    const { panel, body } = createControlsPanel({
      label: visType,
      ariaLabel: `Toggle help for ${visType}`,
      expanded: false
    });

    panel.classList.add('tanvis-help-block-section');

    const description = getVisTypeDescription(visType);
    if (description) {
      const descriptionElement = document.createElement('div');
      descriptionElement.className = 'tanvis-help-block-description';
      descriptionElement.textContent = description;
      body.appendChild(descriptionElement);
    }

    const { rules } = getVisAttributeSchema(visType);
    rules
      .filter((rule) => rule.key !== 'type')
      .forEach((rule) => {
        body.appendChild(createRuleEntry(rule));
      });

    return panel;
  }

  function createRuleEntry(rule) {
    const entry = document.createElement('div');
    entry.className = 'tanvis-help-block-attribute';

    const name = document.createElement('div');
    name.className = 'tanvis-help-block-attribute-name';
    name.textContent = getDataAttributeName(rule);
    entry.appendChild(name);

    const info = document.createElement('div');
    info.className = 'tanvis-help-block-attribute-info';
    info.textContent = rule.info;
    entry.appendChild(info);

    if (rule.allowedValues) {
      const allowedValues = document.createElement('div');
      allowedValues.className = 'tanvis-help-block-attribute-allowed-values';
      allowedValues.textContent = `Allowed values: ${rule.allowedValues.join(', ')}`;
      entry.appendChild(allowedValues);
    }

    if (rule.defaultValue !== undefined && rule.defaultValue !== '') {
      const defaultValue = document.createElement('div');
      defaultValue.className = 'tanvis-help-block-attribute-default-value';
      defaultValue.textContent = `Default value: ${rule.defaultValue}`;
      entry.appendChild(defaultValue);
    }

    return entry;
  }

  const helpBlockAdapter = createHelpBlockAdapter();

  function renderHelpBlock(element, config) {
    helpBlockAdapter.render(element, config);
  }

  // Makes initialization idempotent so calling init() repeatedly 
  // does not keep re-registering the same renderers.


  let defaultsRegistered = false;

  function registerDefaults() {
    if (defaultsRegistered) {
      return;
    }

    registerRenderer('control-block', renderControlBlock);
    registerRenderer('species-identifier', renderSpeciesIdentifier);
    registerRenderer('new-species-table', renderNewSpeciesTable);
    registerRenderer('increasing-species-table', renderIncreasingSpeciesTable);
    registerRenderer('species-absent-since', renderSpeciesAbsentSince);
    registerRenderer('species-map', renderSpeciesMap);
    registerRenderer('grid-stats-map', renderGridStatsMap);
    registerRenderer('temporal-year-chart', renderTemporalYearChart);
    registerRenderer('species-name-block', renderSpeciesNameBlock);
    registerRenderer('species-remarks-block', renderSpeciesRemarksBlock);
    registerRenderer('species-info-block', renderSpeciesInfoBlock);
    registerRenderer('help-block', renderHelpBlock);
    defaultsRegistered = true;
  }

  function init() {
    registerDefaults();

    const elements = scan(document, '.tanvis');

    return elements.map((element) => render(element));
  }

  const version = '0.1.0';

  if (typeof window !== 'undefined') {
    window.Tanvis = window.Tanvis || {};
    window.Tanvis.init = init;
    window.Tanvis.version = version;
  }

  exports.init = init;
  exports.version = version;

  return exports;

})({});
//# sourceMappingURL=tanvis.iife.js.map
