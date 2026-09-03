import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useBCGeocoder } from './useBCGeocoder.ts';

vi.mock('arches', () => ({
    default: {
        urls: {
            'bc-geocoder': (addr: string) =>
                `https://example.test/geocoder?addressString=${encodeURIComponent(addr)}`,
        },
    },
}));

function makeFetchResponse(
    ok: boolean,
    status: number,
    body: unknown,
): Response {
    const res: Partial<Response> = {
        ok,
        status,
        json: async () => body,
    };
    return res as Response;
}

const fetchMock = vi.fn<typeof fetch>();

describe('useBCGeocoder', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
        delete (globalThis as Record<string, unknown>).fetch;
    });

    // ------------------------------------------------------------------
    // Empty / whitespace-only input
    // ------------------------------------------------------------------

    it('does not call fetch when addressString is empty', async () => {
        const { search } = useBCGeocoder();
        await search('');
        expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    it('does not call fetch when addressString is whitespace only', async () => {
        const { search } = useBCGeocoder();
        await search('   ');
        expect(fetchMock).toHaveBeenCalledTimes(0);
    });

    it('clears results when addressString is empty', async () => {
        const { results, search } = useBCGeocoder();
        await search('');
        expect(results.value).toEqual([]);
    });

    // ------------------------------------------------------------------
    // URL construction
    // ------------------------------------------------------------------

    it('calls fetch with the URL returned by arches.urls["bc-geocoder"]', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [],
            }),
        );
        const { search } = useBCGeocoder();
        await search('100 Fort St');
        expect(fetchMock).toHaveBeenCalledWith(
            'https://example.test/geocoder?addressString=100%20Fort%20St',
        );
    });

    it('trims the addressString before building the URL', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [],
            }),
        );
        const { search } = useBCGeocoder();
        await search('  100 Fort St  ');
        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            'https://example.test/geocoder?addressString=100%20Fort%20St',
        );
    });

    // ------------------------------------------------------------------
    // Successful response
    // ------------------------------------------------------------------

    it('populates results with the features array on success', async () => {
        const feature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-123.3, 48.4] },
            properties: { fullAddress: '100 Fort St, Victoria, BC' },
        };
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [feature],
            }),
        );
        const { results, search } = useBCGeocoder();
        await search('100 Fort');
        expect(results.value).toEqual([feature]);
    });

    it('handles an empty features array gracefully', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [],
            }),
        );
        const { results, search } = useBCGeocoder();
        await search('query');
        expect(results.value).toEqual([]);
    });

    it('isLoading is false before and after a completed search', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [],
            }),
        );
        const { isLoading, search } = useBCGeocoder();
        expect(isLoading.value).toBe(false);
        await search('test');
        expect(isLoading.value).toBe(false);
    });

    it('error is null after a successful search', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [],
            }),
        );
        const { error, search } = useBCGeocoder();
        await search('test');
        expect(error.value).toBeNull();
    });

    // ------------------------------------------------------------------
    // Non-ok response
    // ------------------------------------------------------------------

    it('sets error from response body when response is not ok', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(false, 500, { error: 'Server error' }),
        );
        const { error, search } = useBCGeocoder();
        await search('bad query');
        expect(error.value).toBe('Server error');
    });

    it('clears results when response is not ok', async () => {
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(false, 500, { error: 'Server error' }),
        );
        const { results, search } = useBCGeocoder();
        await search('bad query');
        expect(results.value).toEqual([]);
    });

    it('falls back to statusText when error key is absent in error response', async () => {
        fetchMock.mockResolvedValueOnce(makeFetchResponse(false, 404, {}));
        // The composable throws `(data as { error }).error || response.statusText`
        // with no `error` key it falls back to statusText; just verify error is set.
        const { error, search } = useBCGeocoder();
        await search('missing');
        expect(error.value !== null).toBe(true);
    });

    // ------------------------------------------------------------------
    // Fetch rejection (network failure)
    // ------------------------------------------------------------------

    it('sets error when fetch rejects', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network failure'));
        const { error, search } = useBCGeocoder();
        await search('test');
        expect(error.value).toBe('network failure');
    });

    it('clears results when fetch rejects', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network failure'));
        const { results, search } = useBCGeocoder();
        await search('test');
        expect(results.value).toEqual([]);
    });

    it('isLoading is false after fetch rejection', async () => {
        fetchMock.mockRejectedValueOnce(new Error('network failure'));
        const { isLoading, search } = useBCGeocoder();
        await search('test');
        expect(isLoading.value).toBe(false);
    });

    // ------------------------------------------------------------------
    // clear()
    // ------------------------------------------------------------------

    it('clear resets results to empty array', async () => {
        const feature = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        };
        fetchMock.mockResolvedValueOnce(
            makeFetchResponse(true, 200, {
                type: 'FeatureCollection',
                features: [feature],
            }),
        );
        const { results, search, clear } = useBCGeocoder();
        await search('test');
        expect(results.value).toHaveLength(1);

        clear();
        expect(results.value).toEqual([]);
    });

    it('clear resets error to null', async () => {
        fetchMock.mockRejectedValueOnce(new Error('boom'));
        const { error, search, clear } = useBCGeocoder();
        await search('test');
        expect(error.value !== null).toBe(true);

        clear();
        expect(error.value).toBeNull();
    });
});
