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
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100007',
    taxon_identifier: 'NBNSYS0000008324',
    scientific_name: 'Coccinella septempunctata',
    vernacular_name: 'Seven-spot Ladybird',
    vernacular_names: ['Seven-spot Ladybird'],
    taxon_group_external_key: 'coleoptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 2140,
    grid_square_count: 276,
    first_record_date: '1970-04-10',
    last_record_date: '2026-06-15'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100008',
    taxon_identifier: 'NBNSYS0000166146',
    scientific_name: 'Vespula vulgaris',
    vernacular_name: 'Common Wasp',
    vernacular_names: ['Common Wasp'],
    taxon_group_external_key: 'hymenoptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 1683,
    grid_square_count: 223,
    first_record_date: '1974-06-12',
    last_record_date: '2026-06-10'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100009',
    taxon_identifier: 'NBNSYS0000009861',
    scientific_name: 'Apis mellifera',
    vernacular_name: 'Honey Bee',
    vernacular_names: ['Honey Bee'],
    taxon_group_external_key: 'hymenoptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 3048,
    grid_square_count: 341,
    first_record_date: '1968-05-26',
    last_record_date: '2026-06-18'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100010',
    taxon_identifier: 'NBNSYS0100003682',
    scientific_name: 'Lasius niger',
    vernacular_name: 'Black Garden Ant',
    vernacular_names: ['Black Garden Ant'],
    taxon_group_external_key: 'hymenoptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 1329,
    grid_square_count: 188,
    first_record_date: '1969-07-08',
    last_record_date: '2026-06-09'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100011',
    taxon_identifier: 'NHMSYS0000875595',
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
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100012',
    taxon_identifier: 'NBNSYS0000031091',
    scientific_name: 'Pieris brassicae',
    vernacular_name: 'Large White Butterfly',
    vernacular_names: ['Large White Butterfly'],
    taxon_group_external_key: 'lepidoptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 873,
    grid_square_count: 127,
    first_record_date: '1978-05-21',
    last_record_date: '2026-06-14'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100013',
    taxon_identifier: 'NHMSYS0001387317',
    scientific_name: 'Forficula auricularia',
    vernacular_name: 'Common Earwig',
    vernacular_names: ['Common Earwig'],
    taxon_group_external_key: 'dermaptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 967,
    grid_square_count: 144,
    first_record_date: '1972-03-18',
    last_record_date: '2026-06-08'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100014',
    taxon_identifier: 'NBNSYS0000030351',
    scientific_name: 'Lucilia sericata',
    vernacular_name: 'Common Green Bottle Fly',
    vernacular_names: ['Common Green Bottle Fly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 59,
    occurrences_count: 1458,
    grid_square_count: 205,
    first_record_date: '1965-08-02',
    last_record_date: '2026-06-13'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100015',
    taxon_identifier: 'NBNSYS0000009230',
    scientific_name: 'Palomena prasina',
    vernacular_name: 'Common Green Shieldbug',
    vernacular_names: ['Common Green Shieldbug'],
    taxon_group_external_key: 'hemiptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 60,
    occurrences_count: 1186,
    grid_square_count: 162,
    first_record_date: '1981-06-09',
    last_record_date: '2026-06-12'
  },
  {
    uuid: 'f1bcbf4a-2db5-4d6f-b4fb-1d94d4100016',
    taxon_identifier: 'NBNSYS0000007559',
    scientific_name: 'Episyrphus balteatus',
    vernacular_name: 'Marmalade Hoverfly',
    vernacular_names: ['Marmalade Hoverfly'],
    taxon_group_external_key: 'diptera',
    rarity_group_name: 'Common',
    geographic_region_identifier: 58,
    occurrences_count: 2564,
    grid_square_count: 317,
    first_record_date: '1975-04-28',
    last_record_date: '2026-06-16'
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
