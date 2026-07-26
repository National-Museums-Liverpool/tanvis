const DEFAULT_BASE_URL = '/api';

const taxonStatsRows = [
  {
    uuid: '8a13ef57-9f2f-4ec9-91b5-9dc7d0531001',
    taxon_identifier: 'NBNORG0000094747',
    scientific_name: 'Adomerus biguttatus',
    vernacular_name: 'Cow Wheat Shieldbug',
    vernacular_names: ['Cow Wheat Shieldbug'],
    rarity_group_name: 'Local',
    geographic_region_identifier: 58,
    occurrences_count: 1842,
    grid_square_count: 237,
    first_record_date: '1978-06-14',
    last_record_date: '2026-05-11',
    first_recorder: 'J. Whitaker',
    last_recorder: 'R. Bell',
    first_verified_record_date: '1980-07-02',
    last_verified_record_date: '2026-05-20',
    first_verified_recorder: 'A. Shaw',
    last_verified_recorder: 'M. Turner',
    frequency_trend: 56
  },
  {
    uuid: 'b1de346d-5c6a-40b8-87db-6cc8e04e1002',
    taxon_identifier: 'NBNORG0000010184',
    scientific_name: 'Thereva bipunctata',
    vernacular_name: 'Twin-spot Stiletto',
    vernacular_names: ['Twin-spot Stiletto'],
    rarity_group_name: 'Nationally Scarce',
    geographic_region_identifier: null,
    occurrences_count: 923,
    grid_square_count: 88,
    first_record_date: '1964-08-22',
    last_record_date: '2025-09-04',
    first_recorder: 'P. Stokes',
    last_recorder: 'L. Ahmed',
    first_verified_record_date: '1971-05-30',
    last_verified_record_date: '2025-09-10',
    first_verified_recorder: 'C. Gibbons',
    last_verified_recorder: 'K. Doyle',
    frequency_trend: 41
  },
  {
    uuid: 'cbf629cb-0434-44e8-bbe8-bf52f4cf1003',
    taxon_identifier: 'NBNORG0000010180',
    scientific_name: 'Lasiopogon cinctus',
    vernacular_name: 'Spring Heath Robberfly',
    vernacular_names: ['Spring Heath Robberfly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 12034,
    grid_square_count: 612,
    first_record_date: '1952-04-01',
    last_record_date: '2026-06-03',
    first_recorder: 'D. Mercer',
    last_recorder: 'S. Evans',
    first_verified_record_date: '1955-04-23',
    last_verified_record_date: '2026-06-07',
    first_verified_recorder: 'B. Muir',
    last_verified_recorder: 'T. Brookes',
    frequency_trend: 67
  },
  {
    uuid: 'b1da3705-31e6-4dc7-bec5-6f0a6a6a1004',
    taxon_identifier: 'NBNORG0000010181',
    scientific_name: 'Dialineura anilis',
    vernacular_name: 'Swollen Silver-stiletto',
    vernacular_names: ['Swollen Silver-stiletto'],
    rarity_group_name: 'Local',
    geographic_region_identifier: 59,
    occurrences_count: 510,
    grid_square_count: 74,
    first_record_date: '1988-07-18',
    last_record_date: '2026-04-02',
    first_recorder: 'H. Lowe',
    last_recorder: 'G. Murphy',
    first_verified_record_date: '1992-06-10',
    last_verified_record_date: '2026-04-20',
    first_verified_recorder: 'H. Lowe',
    last_verified_recorder: 'G. Murphy',
    frequency_trend: 73
  },
  {
    uuid: '4ef4fa98-d8e6-4f49-80f8-eb924f5f1005',
    taxon_identifier: 'NBNORG0000052153',
    scientific_name: 'Ischnura elegans',
    vernacular_name: 'Blue-tailed Damselfly',
    vernacular_names: ['Blue-tailed Damselfly'],
    rarity_group_name: 'Local',
    geographic_region_identifier: 58,
    occurrences_count: 662,
    grid_square_count: 93,
    first_record_date: '1991-06-21',
    last_record_date: '2026-03-16',
    first_recorder: 'N. Winter',
    last_recorder: 'C. Smith',
    first_verified_record_date: '1993-05-12',
    last_verified_record_date: '2026-03-18',
    first_verified_recorder: 'N. Winter',
    last_verified_recorder: 'C. Smith',
    frequency_trend: 64
  },
  {
    uuid: 'f7ab5296-c1f7-4bdb-9f6e-3ef5eec31006',
    taxon_identifier: 'NBNORG0000008998',
    scientific_name: 'Orthetrum cancellatum',
    vernacular_name: 'Black-tailed Skimmer',
    vernacular_names: ['Black-tailed Skimmer'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 411,
    grid_square_count: 58,
    first_record_date: '2002-04-03',
    last_record_date: '2026-05-04',
    first_recorder: 'K. Price',
    last_recorder: 'H. Douglas',
    first_verified_record_date: '2003-04-11',
    last_verified_record_date: '2026-05-07',
    first_verified_recorder: 'K. Price',
    last_verified_recorder: 'H. Douglas',
    frequency_trend: 52
  },
  {
    uuid: '4dd8d208-d64b-49dc-b8bc-189f4d4a1007',
    taxon_identifier: 'NBNORG0000010143',
    scientific_name: 'Hybomitra bimaculata',
    vernacular_name: 'Hairy-legged Horsefly',
    vernacular_names: ['Hairy-legged Horsefly'],
    rarity_group_name: 'Local',
    geographic_region_identifier: 60,
    occurrences_count: 734,
    grid_square_count: 112,
    first_record_date: '1985-08-16',
    last_record_date: '2026-06-12',
    first_recorder: 'T. Webb',
    last_recorder: 'J. Marsh',
    first_verified_record_date: '1987-07-18',
    last_verified_record_date: '2026-06-15',
    first_verified_recorder: 'T. Webb',
    last_verified_recorder: 'J. Marsh',
    frequency_trend: 61
  },
  {
    uuid: 'f5f8a8d7-7fc6-4c56-82b2-6d1d8afe1008',
    taxon_identifier: 'NBNORG0000101258',
    scientific_name: 'Chlorochroa (Rhytidolomia) juniperina',
    vernacular_name: '',
    vernacular_names: [],
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 2140,
    grid_square_count: 276,
    first_record_date: '1970-04-10',
    last_record_date: '2026-06-15',
    first_recorder: 'A. Brown',
    last_recorder: 'R. Wilson',
    first_verified_record_date: '1971-05-14',
    last_verified_record_date: '2026-06-17',
    first_verified_recorder: 'A. Brown',
    last_verified_recorder: 'R. Wilson',
    frequency_trend: 58
  },
  {
    uuid: 'aad2e6ee-6d4a-4511-8aa1-ae0d8db21009',
    taxon_identifier: 'NBNORG0000010147',
    scientific_name: 'Hybomitra lurida',
    vernacular_name: 'Broad-headed Horsefly',
    vernacular_names: ['Broad-headed Horsefly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 1683,
    grid_square_count: 223,
    first_record_date: '1974-06-12',
    last_record_date: '2026-06-10',
    first_recorder: 'M. Carter',
    last_recorder: 'N. Page',
    first_verified_record_date: '1976-07-01',
    last_verified_record_date: '2026-06-12',
    first_verified_recorder: 'M. Carter',
    last_verified_recorder: 'N. Page',
    frequency_trend: 55
  },
  {
    uuid: 'cf6a4398-c0a3-4f6c-8d32-6abc16d81010',
    taxon_identifier: 'NBNORG0000010123',
    scientific_name: 'Spania nigra',
    vernacular_name: 'Liverwort Snipefly',
    vernacular_names: ['Liverwort Snipefly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 3048,
    grid_square_count: 341,
    first_record_date: '1968-05-26',
    last_record_date: '2026-06-18',
    first_recorder: 'K. Singh',
    last_recorder: 'S. Lee',
    first_verified_record_date: '1970-06-11',
    last_verified_record_date: '2026-06-20',
    first_verified_recorder: 'K. Singh',
    last_verified_recorder: 'S. Lee',
    frequency_trend: 62
  },
  {
    uuid: '72db98cb-cd0d-4a54-9be1-1715a53a1011',
    taxon_identifier: 'NBNORG0000010116',
    scientific_name: 'Xylophagus ater',
    vernacular_name: 'Common Awl-fly',
    vernacular_names: ['Common Awl-fly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 1329,
    grid_square_count: 188,
    first_record_date: '1969-07-08',
    last_record_date: '2026-06-09',
    first_recorder: 'T. Morris',
    last_recorder: 'J. King',
    first_verified_record_date: '1970-08-12',
    last_verified_record_date: '2026-06-11',
    first_verified_recorder: 'T. Morris',
    last_verified_recorder: 'J. King',
    frequency_trend: 53
  },
  {
    uuid: '43874f0a-fe93-4d35-97f9-20bef4f11012',
    taxon_identifier: 'NBNORG0000010139',
    scientific_name: 'Haematopota pluvialis',
    vernacular_name: 'Notch-horned Cleg',
    vernacular_names: ['Notch-horned Cleg'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 402,
    grid_square_count: 64,
    first_record_date: '1998-05-11',
    last_record_date: '2020-08-19',
    first_recorder: 'P. Evans',
    last_recorder: 'H. Davies',
    first_verified_record_date: '1999-04-16',
    last_verified_record_date: '2020-08-21',
    first_verified_recorder: 'P. Evans',
    last_verified_recorder: 'H. Davies',
    frequency_trend: 49
  },
  {
    uuid: 'cb8f451c-475c-41ba-a4f5-63fa3db71013',
    taxon_identifier: 'NBNORG0000010223',
    scientific_name: 'Nephrotoma flavescens',
    vernacular_name: 'Tiger Cranefly',
    vernacular_names: ['Tiger Cranefly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 873,
    grid_square_count: 127,
    first_record_date: '1978-05-21',
    last_record_date: '2026-06-14',
    first_recorder: 'D. Hughes',
    last_recorder: 'L. Foster',
    first_verified_record_date: '1979-06-02',
    last_verified_record_date: '2026-06-16',
    first_verified_recorder: 'D. Hughes',
    last_verified_recorder: 'L. Foster',
    frequency_trend: 57
  },
  {
    uuid: 'e8f91ff0-4ef4-4d2f-b2f0-8eb0c9091014',
    taxon_identifier: 'NBNORG0000010077',
    scientific_name: 'Beris vallata',
    vernacular_name: 'Common Orange Legionnaire',
    vernacular_names: ['Common Orange Legionnaire'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 967,
    grid_square_count: 144,
    first_record_date: '1972-03-18',
    last_record_date: '2026-06-08',
    first_recorder: 'B. Scott',
    last_recorder: 'M. Roberts',
    first_verified_record_date: '1973-04-05',
    last_verified_record_date: '2026-06-10',
    first_verified_recorder: 'B. Scott',
    last_verified_recorder: 'M. Roberts',
    frequency_trend: 51
  },
  {
    uuid: '4af4ca49-b74b-4b4e-a738-c0f2f48a1015',
    taxon_identifier: 'NBNORG0000043114',
    scientific_name: 'Rhagio scolopaceus',
    vernacular_name: 'Downlooker Snipefly',
    vernacular_names: ['Downlooker Snipefly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 1458,
    grid_square_count: 205,
    first_record_date: '1965-08-02',
    last_record_date: '2026-06-13',
    first_recorder: 'C. Palmer',
    last_recorder: 'R. Cole',
    first_verified_record_date: '1966-09-04',
    last_verified_record_date: '2026-06-15',
    first_verified_recorder: 'C. Palmer',
    last_verified_recorder: 'R. Cole',
    frequency_trend: 54
  },
  {
    uuid: 'dfbba554-6fd3-4bbf-8d8f-5f8fb83d1016',
    taxon_identifier: 'NBNORG0000045694',
    scientific_name: 'Acrocera orbiculus',
    vernacular_name: 'Top-horned Hunchback',
    vernacular_names: ['Top-horned Hunchback'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 1186,
    grid_square_count: 162,
    first_record_date: '1981-06-09',
    last_record_date: '2026-06-12',
    first_recorder: 'S. Baker',
    last_recorder: 'J. Howard',
    first_verified_record_date: '1982-07-03',
    last_verified_record_date: '2026-06-14',
    first_verified_recorder: 'S. Baker',
    last_verified_recorder: 'J. Howard',
    frequency_trend: 50
  },
  {
    uuid: '108b536e-00f4-4d11-b3dd-4be2451c1017',
    taxon_identifier: 'NBNORG0000010128',
    scientific_name: 'Rhagio lineola',
    vernacular_name: 'Small Fleck-winged Snipefly',
    vernacular_names: ['Small Fleck-winged Snipefly'],
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 2564,
    grid_square_count: 317,
    first_record_date: '1975-04-28',
    last_record_date: '2026-06-16',
    first_recorder: 'L. Grant',
    last_recorder: 'E. Ward',
    first_verified_record_date: '1976-05-14',
    last_verified_record_date: '2026-06-18',
    first_verified_recorder: 'L. Grant',
    last_verified_recorder: 'E. Ward',
    frequency_trend: 59
  }
];

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

function normaliseBase(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

function isTaxonStatsRequest(url, baseUrl) {
  const trimmedBase = normaliseBase(baseUrl);
  return url.pathname === `${trimmedBase}/v1/taxon-stats`;
}

function parsePositiveInteger(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function buildListResponse(url, data, total, limit, offset) {
  const nextOffset = offset + limit;
  const previousOffset = offset - limit;

  const self = new URL(url.toString());
  self.searchParams.set('limit', String(limit));
  self.searchParams.set('offset', String(offset));

  const next = nextOffset < total ? new URL(url.toString()) : null;
  const prev = previousOffset >= 0 ? new URL(url.toString()) : null;

  if (next) {
    next.searchParams.set('limit', String(limit));
    next.searchParams.set('offset', String(nextOffset));
  }

  if (prev) {
    prev.searchParams.set('limit', String(limit));
    prev.searchParams.set('offset', String(previousOffset));
  }

  return {
    data,
    meta: {
      limit,
      offset,
      count: data.length,
      total
    },
    links: {
      self: `${self.pathname}${self.search}`,
      next: next ? `${next.pathname}${next.search}` : null,
      prev: prev ? `${prev.pathname}${prev.search}` : null
    }
  };
}

function includeTaxonRequested(url) {
  const includeParams = url.searchParams.getAll('include');
  return includeParams.some((value) => {
    return value
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .includes('taxon');
  });
}

function stripTaxonNameFields(row) {
  const {
    scientific_name,
    vernacular_name,
    vernacular_names,
    ...rest
  } = row;

  return rest;
}

function handleTaxonStatsRequest(url) {
  const geographicRegionFilter = url.searchParams.get('geographic_region_identifier[eq]');
  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);
  const includeTaxon = includeTaxonRequested(url);
  const filtered = taxonStatsRows.filter((row) => {
    if (!geographicRegionFilter) {
      return true;
    }

    const geographicRegionIdentifier = Number(geographicRegionFilter);
    return Number.isFinite(geographicRegionIdentifier) && row.geographic_region_identifier === geographicRegionIdentifier;
  });
  const page = filtered
    .slice(offset, offset + limit)
    .map((row) => (includeTaxon ? row : stripTaxonNameFields(row)));

  return jsonResponse(200, buildListResponse(url, page, filtered.length, limit, offset));
}

export function installSpeciesStatsMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
    const isSupported = isTaxonStatsRequest(requestUrl, baseUrl);

    if (!isSupported) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    if (isTaxonStatsRequest(requestUrl, baseUrl)) {
      console.log('[species-stats-mock] API request:', `${requestUrl.pathname}${requestUrl.search}`);
      return handleTaxonStatsRequest(requestUrl);
    }
  };

  return function uninstallSpeciesStatsMockApi() {
    window.fetch = originalFetch;
  };
}

export function listMockSpeciesIds() {
  return taxonStatsRows.map((row) => row.taxon_identifier);
}
