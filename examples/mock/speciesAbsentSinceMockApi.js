const DEFAULT_BASE_URL = '/api';

const taxonStatsRows = [
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100001',
    taxon_identifier: 'NHMSYS0000001001',
    scientific_name: 'Eristalis arbustorum',
    vernacular_name: 'Marmalade Hoverfly',
    vernacular_names: ['Marmalade Hoverfly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Local',
    geographic_region_identifier: 58,
    occurrences_count: 1842,
    grid_square_count: 237,
    first_record_date: '1978-06-14',
    last_record_date: '2023-05-11'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100002',
    taxon_identifier: 'NHMSYS0000001002',
    scientific_name: 'Criorhina berberina',
    vernacular_name: 'Hairy-eyed Hoverfly',
    vernacular_names: ['Hairy-eyed Hoverfly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Nationally Scarce',
    geographic_region_identifier: 59,
    occurrences_count: 923,
    grid_square_count: 88,
    first_record_date: '1964-08-22',
    last_record_date: '2021-09-04'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100003',
    taxon_identifier: 'NHMSYS0000001003',
    scientific_name: 'Syritta pipiens',
    vernacular_name: 'Thick-legged Hoverfly',
    vernacular_names: ['Thick-legged Hoverfly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 12034,
    grid_square_count: 612,
    first_record_date: '1952-04-01',
    last_record_date: '2026-06-03'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100004',
    taxon_identifier: 'NHMSYS0000002001',
    scientific_name: 'Eristalis tenax',
    vernacular_name: 'Drone Fly',
    vernacular_names: ['Drone Fly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 14,
    grid_square_count: 8,
    first_record_date: '2025-04-12',
    last_record_date: '2025-07-04'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100005',
    taxon_identifier: 'NHMSYS0000002004',
    scientific_name: 'Helophilus pendulus',
    vernacular_name: 'Sun Fly',
    vernacular_names: ['Sun Fly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 11,
    grid_square_count: 7,
    first_record_date: '2025-03-08',
    last_record_date: '2025-07-29'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100006',
    taxon_identifier: 'NHMSYS0000003001',
    scientific_name: 'Bombus terrestris',
    vernacular_name: 'Buff-tailed Bumblebee',
    vernacular_names: ['Buff-tailed Bumblebee'],
    taxon_group_external_key: 'hymenoptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 402,
    grid_square_count: 64,
    first_record_date: '1998-05-11',
    last_record_date: '2020-08-19'
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
  const lastRecordDateLimit = url.searchParams.get('last_record_date[lte]');
  const geographicRegionFilter = url.searchParams.get('geographic_region_identifier[eq]');
  const taxonGroupFilter = url.searchParams.get('taxon_group_external_key[eq]');
  const includeTaxon = includeTaxonRequested(url);
  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);

  if (!lastRecordDateLimit) {
    return jsonResponse(400, { error: 'last_record_date[lte] is required' });
  }

  const filtered = taxonStatsRows.filter((row) => {
    if (row.last_record_date > lastRecordDateLimit) {
      return false;
    }

    if (geographicRegionFilter) {
      const geographicRegionIdentifier = Number(geographicRegionFilter);
      if (!Number.isFinite(geographicRegionIdentifier) || row.geographic_region_identifier !== geographicRegionIdentifier) {
        return false;
      }
    }

    if (taxonGroupFilter && row.taxon_group_external_key !== taxonGroupFilter) {
      return false;
    }

    return true;
  });

  const page = filtered
    .slice(offset, offset + limit)
    .map((row) => (includeTaxon ? row : stripTaxonNameFields(row)));

  return jsonResponse(200, buildListResponse(url, page, filtered.length, limit, offset));
}

export function installSpeciesAbsentSinceMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);

    if (!isTaxonStatsRequest(requestUrl, baseUrl)) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    console.log('[species-absent-since-mock] API request:', `${requestUrl.pathname}${requestUrl.search}`);
    return handleTaxonStatsRequest(requestUrl);
  };

  return function uninstallSpeciesAbsentSinceMockApi() {
    window.fetch = originalFetch;
  };
}
