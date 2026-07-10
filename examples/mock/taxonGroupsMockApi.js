const DEFAULT_BASE_URL = '/api';

const taxonGroupRows = [
  { external_key: 'lepidoptera', title: 'Lepidoptera', friendly: 'Butterflies and moths' },
  { external_key: 'hymenoptera', title: 'Hymenoptera', friendly: 'Bees, wasps, ants and sawflies' },
  { external_key: 'diptera', title: 'Diptera', friendly: 'True flies' },
  { external_key: 'coleoptera', title: 'Coleoptera', friendly: 'Beetles' },
  { external_key: 'hemiptera', title: 'Hemiptera', friendly: 'True bugs' },
  { external_key: 'odonata', title: 'Odonata', friendly: 'Dragonflies and damselflies' },
  { external_key: 'orthoptera', title: 'Orthoptera', friendly: 'Grasshoppers and crickets' },
  { external_key: 'araneae', title: 'Araneae', friendly: 'Spiders' },
  { external_key: 'opiliones', title: 'Opiliones', friendly: 'Harvestmen' },
  { external_key: 'acari', title: 'Acari', friendly: 'Ticks and mites' },
  { external_key: 'pseudoscorpiones', title: 'Pseudoscorpiones', friendly: 'Pseudoscorpions' },
  { external_key: 'gastropoda', title: 'Gastropoda', friendly: 'Slugs and snails' },
  { external_key: 'bivalvia', title: 'Bivalvia', friendly: 'Bivalves' },
  { external_key: 'isopoda', title: 'Isopoda', friendly: 'Woodlice' },
  { external_key: 'chilopoda', title: 'Chilopoda', friendly: 'Centipedes' },
  { external_key: 'diplopoda', title: 'Diplopoda', friendly: 'Millipedes' },
  { external_key: 'oligochaeta', title: 'Oligochaeta', friendly: 'Earthworms' },
  { external_key: 'hirudinea', title: 'Hirudinea', friendly: 'Leeches' },
  { external_key: 'cnidaria', title: 'Cnidaria', friendly: 'Sea anemones, corals and jellyfish' },
  { external_key: 'echinodermata', title: 'Echinodermata', friendly: 'Starfish, sea urchins and sea cucumbers' }
];

export function installTaxonGroupsMockApi(options = {}) {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const latencyMs = Number.isFinite(options.latencyMs) ? options.latencyMs : 120;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.origin);
    if (!isTaxonGroupsRequest(requestUrl, baseUrl)) {
      return originalFetch(input, init);
    }

    if (latencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, latencyMs));
    }

    return handleTaxonGroupsRequest(requestUrl);
  };

  return function uninstallTaxonGroupsMockApi() {
    window.fetch = originalFetch;
  };
}

function isTaxonGroupsRequest(url, baseUrl) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return url.pathname === `${trimmedBase}/v1/taxon-groups`;
}

function handleTaxonGroupsRequest(url) {
  const limit = parsePositiveInteger(url.searchParams.get('limit'), 1000);
  const offset = parsePositiveInteger(url.searchParams.get('offset'), 0);
  const page = taxonGroupRows.slice(offset, offset + limit);

  return jsonResponse(200, buildListResponse(url, page, taxonGroupRows.length, limit, offset));
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

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}