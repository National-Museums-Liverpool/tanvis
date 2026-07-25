const DEFAULT_BASE_URL = '/api';

const taxonStatsRows = [
  {
    uuid: 'f4a4f72c-02d0-43a8-9b8f-7d3d205dc001',
    taxon_identifier: 'NHMSYS0000002001',
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
    taxon_identifier: 'NHMSYS0000002002',
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
    taxon_identifier: 'NHMSYS0000002003',
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
    taxon_identifier: 'NHMSYS0000002004',
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
  },
  {
    uuid: '0d8354b8-5161-4dee-bbfa-9cf64516d005',
    taxon_identifier: 'NBNSYS0000008324',
    scientific_name_identifier: 'TVK-2005',
    scientific_name: 'Coccinella septempunctata',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Seven-spot Ladybird',
    vernacular_names: ['Seven-spot Ladybird'],
    taxon_group_external_key: 'coleoptera',
    id_difficulty: 1,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 58,
    occurrences_count: 2140,
    grid_square_count: 276,
    first_record_date: '2026-06-01',
    last_record_date: '2026-06-15',
    first_recorder: 'A. Brown',
    last_recorder: 'R. Wilson',
    first_verified_record_date: '2026-06-01',
    last_verified_record_date: '2026-06-15',
    first_verified_recorder: 'A. Brown',
    last_verified_recorder: 'R. Wilson'
  },
  {
    uuid: 'f3af3df7-5ef5-4261-94f1-dc0f9e6fa006',
    taxon_identifier: 'NBNSYS0000166146',
    scientific_name_identifier: 'TVK-2006',
    scientific_name: 'Vespula vulgaris',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Common Wasp',
    vernacular_names: ['Common Wasp'],
    taxon_group_external_key: 'hymenoptera',
    id_difficulty: 1,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 59,
    occurrences_count: 1683,
    grid_square_count: 223,
    first_record_date: '2026-06-03',
    last_record_date: '2026-06-10',
    first_recorder: 'M. Carter',
    last_recorder: 'N. Page',
    first_verified_record_date: '2026-06-03',
    last_verified_record_date: '2026-06-10',
    first_verified_recorder: 'M. Carter',
    last_verified_recorder: 'N. Page'
  },
  {
    uuid: 'd81d45bb-9719-4884-b1bd-d8f354987007',
    taxon_identifier: 'NBNSYS0000009861',
    scientific_name_identifier: 'TVK-2007',
    scientific_name: 'Apis mellifera',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Honey Bee',
    vernacular_names: ['Honey Bee'],
    taxon_group_external_key: 'hymenoptera',
    id_difficulty: 1,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 60,
    occurrences_count: 3048,
    grid_square_count: 341,
    first_record_date: '2026-06-04',
    last_record_date: '2026-06-18',
    first_recorder: 'K. Singh',
    last_recorder: 'S. Lee',
    first_verified_record_date: '2026-06-04',
    last_verified_record_date: '2026-06-18',
    first_verified_recorder: 'K. Singh',
    last_verified_recorder: 'S. Lee'
  },
  {
    uuid: '5ef4d55d-bd26-4dd6-9b3e-d4898f3d8008',
    taxon_identifier: 'NBNSYS0100003682',
    scientific_name_identifier: 'TVK-2008',
    scientific_name: 'Lasius niger',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Black Garden Ant',
    vernacular_names: ['Black Garden Ant'],
    taxon_group_external_key: 'hymenoptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 58,
    occurrences_count: 1329,
    grid_square_count: 188,
    first_record_date: '2026-06-05',
    last_record_date: '2026-06-09',
    first_recorder: 'T. Morris',
    last_recorder: 'J. King',
    first_verified_record_date: '2026-06-05',
    last_verified_record_date: '2026-06-09',
    first_verified_recorder: 'T. Morris',
    last_verified_recorder: 'J. King'
  },
  {
    uuid: 'd644c0db-90d4-4da6-987c-fa6c14b48009',
    taxon_identifier: 'NHMSYS0000875595',
    scientific_name_identifier: 'TVK-2009',
    scientific_name: 'Bombus terrestris',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Buff-tailed Bumblebee',
    vernacular_names: ['Buff-tailed Bumblebee'],
    taxon_group_external_key: 'hymenoptera',
    id_difficulty: 1,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 59,
    occurrences_count: 402,
    grid_square_count: 64,
    first_record_date: '2026-06-06',
    last_record_date: '2026-06-10',
    first_recorder: 'P. Evans',
    last_recorder: 'H. Davies',
    first_verified_record_date: '2026-06-06',
    last_verified_record_date: '2026-06-10',
    first_verified_recorder: 'P. Evans',
    last_verified_recorder: 'H. Davies'
  },
  {
    uuid: '66367d51-cf83-4c5b-a5c2-39d7eb8d2010',
    taxon_identifier: 'NBNSYS0000031091',
    scientific_name_identifier: 'TVK-2010',
    scientific_name: 'Pieris brassicae',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Large White Butterfly',
    vernacular_names: ['Large White Butterfly'],
    taxon_group_external_key: 'lepidoptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 60,
    occurrences_count: 873,
    grid_square_count: 127,
    first_record_date: '2026-06-07',
    last_record_date: '2026-06-14',
    first_recorder: 'D. Hughes',
    last_recorder: 'L. Foster',
    first_verified_record_date: '2026-06-07',
    last_verified_record_date: '2026-06-14',
    first_verified_recorder: 'D. Hughes',
    last_verified_recorder: 'L. Foster'
  },
  {
    uuid: 'a031b0ac-e3f8-4a2a-a783-0d4f6ac42011',
    taxon_identifier: 'NHMSYS0001387317',
    scientific_name_identifier: 'TVK-2011',
    scientific_name: 'Forficula auricularia',
    scientific_name_authorship: 'Linnaeus, 1758',
    vernacular_name: 'Common Earwig',
    vernacular_names: ['Common Earwig'],
    taxon_group_external_key: 'dermaptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 58,
    occurrences_count: 967,
    grid_square_count: 144,
    first_record_date: '2026-06-08',
    last_record_date: '2026-06-08',
    first_recorder: 'B. Scott',
    last_recorder: 'M. Roberts',
    first_verified_record_date: '2026-06-08',
    last_verified_record_date: '2026-06-08',
    first_verified_recorder: 'B. Scott',
    last_verified_recorder: 'M. Roberts'
  },
  {
    uuid: '23656d73-bb53-4f39-bbf6-2681fc1d2012',
    taxon_identifier: 'NBNSYS0000030351',
    scientific_name_identifier: 'TVK-2012',
    scientific_name: 'Lucilia sericata',
    scientific_name_authorship: 'Meigen, 1826',
    vernacular_name: 'Common Green Bottle Fly',
    vernacular_names: ['Common Green Bottle Fly'],
    taxon_group_external_key: 'diptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 59,
    occurrences_count: 1458,
    grid_square_count: 205,
    first_record_date: '2026-06-09',
    last_record_date: '2026-06-13',
    first_recorder: 'C. Palmer',
    last_recorder: 'R. Cole',
    first_verified_record_date: '2026-06-09',
    last_verified_record_date: '2026-06-13',
    first_verified_recorder: 'C. Palmer',
    last_verified_recorder: 'R. Cole'
  },
  {
    uuid: '498f8f73-a6e2-49aa-b228-4a9b9c2b2013',
    taxon_identifier: 'NBNSYS0000009230',
    scientific_name_identifier: 'TVK-2013',
    scientific_name: 'Palomena prasina',
    scientific_name_authorship: 'Linnaeus, 1761',
    vernacular_name: 'Common Green Shieldbug',
    vernacular_names: ['Common Green Shieldbug'],
    taxon_group_external_key: 'hemiptera',
    id_difficulty: 2,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 60,
    occurrences_count: 1186,
    grid_square_count: 162,
    first_record_date: '2026-06-10',
    last_record_date: '2026-06-12',
    first_recorder: 'S. Baker',
    last_recorder: 'J. Howard',
    first_verified_record_date: '2026-06-10',
    last_verified_record_date: '2026-06-12',
    first_verified_recorder: 'S. Baker',
    last_verified_recorder: 'J. Howard'
  },
  {
    uuid: '24f6064f-b5e2-49f0-8d66-38f16dc52014',
    taxon_identifier: 'NBNSYS0000007559',
    scientific_name_identifier: 'TVK-2014',
    scientific_name: 'Episyrphus balteatus',
    scientific_name_authorship: 'De Geer, 1776',
    vernacular_name: 'Marmalade Hoverfly',
    vernacular_names: ['Marmalade Hoverfly'],
    taxon_group_external_key: 'diptera',
    id_difficulty: 1,
    recording_scheme_external_key: 'ABCD1234EFGH5678',
    conservation_status: 'LC',
    taxon_remarks: null,
    rarity_group_name: 'common',
    geographic_region_identifier: 58,
    occurrences_count: 2564,
    grid_square_count: 317,
    first_record_date: '2026-06-11',
    last_record_date: '2026-06-16',
    first_recorder: 'L. Grant',
    last_recorder: 'E. Ward',
    first_verified_record_date: '2026-06-11',
    last_verified_record_date: '2026-06-16',
    first_verified_recorder: 'L. Grant',
    last_verified_recorder: 'E. Ward'
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
  const includeTaxon = includeTaxonRequested(url);

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

  const page = filtered
    .slice(offset, offset + limit)
    .map((row) => (includeTaxon ? row : stripTaxonNameFields(row)));
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