const DEFAULT_BASE_URL = '/api';

const taxonStatsRows = [
  {
    uuid: 'f4a4f72c-02d0-43a8-9b8f-7d3d205dc001',
    taxon_identifier: '2001',
    scientific_name_identifier: 'TVK-2001',
    scientific_name: 'Eristalis tenax',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Drone Fly',
    vernacular_names: ['Drone Fly'],
    taxon_group_external_key: 'diptera',
    id_difficulty: 1,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 58,
    occurrences_count: 14,
    grid_square_count: 8,
    first_record_date: '2025-04-12',
    last_record_date: '2025-07-04',
    first_recorder: 'J. Smith',
    last_recorder: 'A. Jones',
    first_verified_record_date: '2025-04-12',
    last_verified_record_date: '2025-07-04',
    first_verified_recorder: 'J. Smith',
    last_verified_recorder: 'A. Jones'
  },
  {
    uuid: 'd5f1f981-5322-4da0-8f6c-5fa95e43f002',
    taxon_identifier: '2002',
    scientific_name_identifier: 'TVK-2002',
    scientific_name: 'Volucella pellucens',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Pellucid Hoverfly',
    vernacular_names: ['Pellucid Hoverfly'],
    taxon_group_external_key: 'diptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 59,
    occurrences_count: 9,
    grid_square_count: 6,
    first_record_date: '2025-06-01',
    last_record_date: '2025-08-21',
    first_recorder: 'P. Lewis',
    last_recorder: 'P. Lewis',
    first_verified_record_date: '2025-06-01',
    last_verified_record_date: '2025-08-21',
    first_verified_recorder: 'P. Lewis',
    last_verified_recorder: 'P. Lewis'
  },
  {
    uuid: '9a14f59b-c190-4385-a779-5179186d3003',
    taxon_identifier: '2003',
    scientific_name_identifier: 'TVK-2003',
    scientific_name: 'Cheilosia illustrata',
    scientific_name_authorship: 'Harris, 1780',
    vernacular_name: 'Large Black Hoverfly',
    vernacular_names: ['Large Black Hoverfly'],
    taxon_group_external_key: 'diptera',
    id_difficulty: 3,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'scarce',
    geographic_region_identifier: 60,
    occurrences_count: 5,
    grid_square_count: 4,
    first_record_date: '2026-05-19',
    last_record_date: '2026-05-19',
    first_recorder: 'M. Patel',
    last_recorder: 'M. Patel',
    first_verified_record_date: '2026-05-19',
    last_verified_record_date: '2026-05-19',
    first_verified_recorder: 'M. Patel',
    last_verified_recorder: 'M. Patel'
  },
  {
    uuid: 'c26a7818-95a7-4583-95b8-9e28ebf14004',
    taxon_identifier: '2004',
    scientific_name_identifier: 'TVK-2004',
    scientific_name: 'Helophilus pendulus',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Sun Fly',
    vernacular_names: ['Sun Fly'],
    taxon_group_external_key: 'diptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 60,
    occurrences_count: 11,
    grid_square_count: 7,
    first_record_date: '2025-03-08',
    last_record_date: '2025-07-29',
    first_recorder: 'R. Walker',
    last_recorder: 'R. Walker',
    first_verified_record_date: '2025-03-08',
    last_verified_record_date: '2025-07-29',
    first_verified_recorder: 'R. Walker',
    last_verified_recorder: 'R. Walker'
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

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normaliseBase(baseUrl) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return trimmedBase;
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

function handleTaxonStatsRequest(url) {
  const startDate = url.searchParams.get('first_record_date[gte]');
  const endDate = url.searchParams.get('first_record_date[lte]');
  const geographicRegionFilter = url.searchParams.get('geographic_region_identifier[eq]');

  if (!startDate) {
    return jsonResponse(400, { error: 'first_record_date[gte] is required' });
  }

  if (!endDate) {
    return jsonResponse(400, { error: 'first_record_date[lte] is required' });
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return jsonResponse(400, { error: 'Dates must use YYYY-MM-DD format' });
  }

  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);

  const filtered = taxonStatsRows.filter((row) => {
    if (row.first_record_date < startDate || row.first_record_date > endDate) {
      return false;
    }

    if (!geographicRegionFilter) {
      return true;
    }

    const geographicRegionIdentifier = Number(geographicRegionFilter);
    return Number.isFinite(geographicRegionIdentifier) && row.geographic_region_identifier === geographicRegionIdentifier;
  });

  const page = filtered.slice(offset, offset + limit);
  return jsonResponse(200, buildListResponse(url, page, filtered.length, limit, offset));
}

export function installNewSpeciesMockApi(options = {}) {
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
      console.log('[new-species-mock] API request:', `${requestUrl.pathname}${requestUrl.search}`);
      return handleTaxonStatsRequest(requestUrl);
    }
  };

  return function uninstallNewSpeciesMockApi() {
    window.fetch = originalFetch;
  };
}