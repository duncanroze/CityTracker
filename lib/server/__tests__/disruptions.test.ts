import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env before importing the module (Vitest hoists vi.mock calls)
vi.mock('../env', () => ({
  env: { PRIM_API_KEY: 'test-key', DATABASE_URL: 'mock', DIRECT_URL: 'mock' },
}));

// Mock idfm-mapping with a small subset
vi.mock('@/prisma/data/idfm-mapping', () => ({
  idfmLineMapping: {
    M1: 'C01371',
    M4: 'C01374',
    'RER-A': 'C01742',
  },
}));

function makeDisruption(opts: {
  id?: string;
  effect?: string;
  lineIdfmId?: string;
  message?: string;
  beginDate?: string;
  endDate?: string;
}) {
  return {
    id: opts.id ?? 'disruption-1',
    severity: { effect: opts.effect ?? 'SIGNIFICANT_DELAYS' },
    messages: opts.message !== undefined ? [{ text: opts.message }] : [],
    application_periods: opts.beginDate || opts.endDate
      ? [{ begin: opts.beginDate, end: opts.endDate }]
      : [],
    impacted_objects: opts.lineIdfmId
      ? [{ pt_object: { id: `line:IDFM:${opts.lineIdfmId}`, embedded_type: 'line' } }]
      : [],
  };
}

describe('disruptions', () => {
  let getDisruptions: typeof import('../disruptions').getDisruptions;
  const mockFetch = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    // Re-mock after resetModules
    vi.doMock('../env', () => ({
      env: { PRIM_API_KEY: 'test-key', DATABASE_URL: 'mock', DIRECT_URL: 'mock' },
    }));
    vi.doMock('@/prisma/data/idfm-mapping', () => ({
      idfmLineMapping: { M1: 'C01371', M4: 'C01374', 'RER-A': 'C01742' },
    }));
    global.fetch = mockFetch;
    mockFetch.mockReset();
    const mod = await import('../disruptions');
    getDisruptions = mod.getDisruptions;
  });

  it('returns empty map when API key is empty', async () => {
    vi.doMock('../env', () => ({
      env: { PRIM_API_KEY: '', DATABASE_URL: 'mock', DIRECT_URL: 'mock' },
    }));
    vi.resetModules();
    vi.doMock('@/prisma/data/idfm-mapping', () => ({
      idfmLineMapping: { M1: 'C01371' },
    }));
    const mod = await import('../disruptions');
    const result = await mod.getDisruptions();
    expect(result.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('maps SIGNIFICANT_DELAYS to disrupted', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [makeDisruption({ effect: 'SIGNIFICANT_DELAYS', lineIdfmId: 'C01371' })],
      }),
    });

    const result = await getDisruptions();
    expect(result.get('M1')?.severity).toBe('disrupted');
  });

  it('maps NO_SERVICE to interrupted', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [makeDisruption({ effect: 'NO_SERVICE', lineIdfmId: 'C01371' })],
      }),
    });

    const result = await getDisruptions();
    expect(result.get('M1')?.severity).toBe('interrupted');
  });

  it('maps REDUCED_SERVICE to disrupted', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [makeDisruption({ effect: 'REDUCED_SERVICE', lineIdfmId: 'C01374' })],
      }),
    });

    const result = await getDisruptions();
    expect(result.get('M4')?.severity).toBe('disrupted');
  });

  it('ignores disruptions with ok severity (UNKNOWN_EFFECT)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [makeDisruption({ effect: 'UNKNOWN_EFFECT', lineIdfmId: 'C01371' })],
      }),
    });

    const result = await getDisruptions();
    expect(result.size).toBe(0);
  });

  it('strips HTML from messages', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [
          makeDisruption({
            effect: 'SIGNIFICANT_DELAYS',
            lineIdfmId: 'C01371',
            message: '<p>Trafic perturb&eacute; sur la <b>ligne 1</b></p>',
          }),
        ],
      }),
    });

    const result = await getDisruptions();
    const disruption = result.get('M1');
    expect(disruption?.message).not.toContain('<');
    expect(disruption?.message).not.toContain('>');
  });

  it('upgrades severity (interrupted takes priority over disrupted)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [
          makeDisruption({ id: 'd1', effect: 'SIGNIFICANT_DELAYS', lineIdfmId: 'C01371' }),
          makeDisruption({ id: 'd2', effect: 'NO_SERVICE', lineIdfmId: 'C01371' }),
        ],
      }),
    });

    const result = await getDisruptions();
    expect(result.get('M1')?.severity).toBe('interrupted');
  });

  it('does not downgrade severity', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [
          makeDisruption({ id: 'd1', effect: 'NO_SERVICE', lineIdfmId: 'C01371' }),
          makeDisruption({ id: 'd2', effect: 'SIGNIFICANT_DELAYS', lineIdfmId: 'C01371' }),
        ],
      }),
    });

    const result = await getDisruptions();
    expect(result.get('M1')?.severity).toBe('interrupted');
  });

  it('filters out disruptions outside their application period', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [
          makeDisruption({
            effect: 'NO_SERVICE',
            lineIdfmId: 'C01371',
            beginDate: '20200101T000000',
            endDate: '20200102T000000',
          }),
        ],
      }),
    });

    const result = await getDisruptions();
    expect(result.size).toBe(0);
  });

  it('includes disruptions with no application period (always active)', async () => {
    const disruption = makeDisruption({
      effect: 'SIGNIFICANT_DELAYS',
      lineIdfmId: 'C01371',
    });
    disruption.application_periods = [];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ disruptions: [disruption] }),
    });

    const result = await getDisruptions();
    expect(result.get('M1')?.severity).toBe('disrupted');
  });

  it('returns empty map on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    });

    const result = await getDisruptions();
    expect(result.size).toBe(0);
  });

  it('returns empty map on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await getDisruptions();
    expect(result.size).toBe(0);
  });

  it('ignores unknown line IDs not in our mapping', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [
          makeDisruption({ effect: 'NO_SERVICE', lineIdfmId: 'UNKNOWN_LINE' }),
        ],
      }),
    });

    const result = await getDisruptions();
    expect(result.size).toBe(0);
  });

  it('handles multiple lines affected', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        disruptions: [
          makeDisruption({ id: 'd1', effect: 'SIGNIFICANT_DELAYS', lineIdfmId: 'C01371' }),
          makeDisruption({ id: 'd2', effect: 'NO_SERVICE', lineIdfmId: 'C01374' }),
        ],
      }),
    });

    const result = await getDisruptions();
    expect(result.get('M1')?.severity).toBe('disrupted');
    expect(result.get('M4')?.severity).toBe('interrupted');
  });

  it('returns cached data on second call within TTL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        disruptions: [makeDisruption({ effect: 'NO_SERVICE', lineIdfmId: 'C01371' })],
      }),
    });

    await getDisruptions();
    await getDisruptions();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
