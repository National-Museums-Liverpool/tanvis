const DEFAULT_BASE_URL = '/api';

const taxonStatsRows = [
  {
    uuid: '8a13ef57-9f2f-4ec9-91b5-9dc7d0531001',
    taxon_identifier: '1001',
    scientific_name: 'Eristalis arbustorum',
    vernacular_name: 'Marmalade Hoverfly',
    vernacular_names: ['Marmalade Hoverfly'],
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
    taxon_identifier: '1002',
    scientific_name: 'Criorhina berberina',
    vernacular_name: 'Hairy-eyed Hoverfly',
    vernacular_names: ['Hairy-eyed Hoverfly'],
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
    taxon_identifier: '1003',
    scientific_name: 'Syritta pipiens',
    vernacular_name: 'Thick-legged Hoverfly',
    vernacular_names: ['Thick-legged Hoverfly'],
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
    taxon_identifier: '1004',
    scientific_name: 'Volucella zonaria',
    vernacular_name: 'Hornet Mimic Hoverfly',
    vernacular_names: ['Hornet Mimic Hoverfly'],
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
    taxon_identifier: '1005',
    scientific_name: 'Rhingia campestris',
    vernacular_name: 'Humpbacked Hoverfly',
    vernacular_names: ['Humpbacked Hoverfly'],
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
    taxon_identifier: '1006',
    scientific_name: 'Myathropa florea',
    vernacular_name: 'Batman Hoverfly',
    vernacular_names: ['Batman Hoverfly'],
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
    taxon_identifier: '1007',
    scientific_name: 'Merodon equestris',
    vernacular_name: 'Narcissus Bulb Fly',
    vernacular_names: ['Narcissus Bulb Fly'],
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
