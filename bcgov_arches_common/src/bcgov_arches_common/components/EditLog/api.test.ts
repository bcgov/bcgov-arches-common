import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

// Module under test
import {
    getEditLogForTile,
    getEditLogForNodegroupId,
    getEditLogForNodeAlias,
    getEditLogForResource,
} from './api.ts';

// Mock the 'arches' module to control URL building used inside api.ts
vi.mock('arches', () => ({
    default: {
        urls: {
            resource_edit_log: (resourceId: string) =>
                `https://example.test/resources/${resourceId}/edit-log`,
        },
    },
}));

// Helper to build a minimal fetch Response-like object without using `any`
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

// We'll install a typed global fetch mock for each test
const fetchMock = vi.fn<typeof fetch>();

describe('EditLog API', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        // Install on globalThis with the proper type
        globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
        // Clean up to avoid cross-test leakage
        delete (globalThis as Record<string, unknown>).fetch;
    });

    it('getEditLogForTile builds the correct URL and returns parsed JSON', async () => {
        const expected = {
            modified_on: '2025-01-01T00:00:00Z',
            modified_by: 'alice',
            transaction_id: 'tx1',
            edit_type: 'update',
            user_email: 'alice@example.test',
            is_system_edit: false,
        } as const;

        fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, expected));

        const data = await getEditLogForTile('r1', 't1');

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            'https://example.test/resources/r1/edit-log?tile_id=t1',
        );
        expect(data).toEqual(expected);
    });

    it('getEditLogForNodegroupId builds the correct URL', async () => {
        const expected = {
            modified_on: null,
            modified_by: null,
            transaction_id: null,
            edit_type: null,
            user_email: null,
            is_system_edit: false,
        } as const;

        fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, expected));

        const data = await getEditLogForNodegroupId('res-9', 'ng-123');

        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            'https://example.test/resources/res-9/edit-log?nodegroup_id=ng-123',
        );
        expect(data).toEqual(expected);
    });

    it('getEditLogForNodeAlias builds the correct URL with graph_slug and node_alias', async () => {
        const expected = {
            modified_on: '2024-12-31T23:59:59Z',
            modified_by: 'bob',
            transaction_id: 'tx-77',
            edit_type: 'create',
            user_email: 'bob@example.test',
            is_system_edit: true,
            method_used: 'POST',
            nodegroup_id: 'ng-9',
            tile_id: 'tile-1',
        } as const;

        fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, expected));

        const data = await getEditLogForNodeAlias(
            'rX',
            'graph-abc',
            'alias.def',
        );

        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            'https://example.test/resources/rX/edit-log?graph_slug=graph-abc&node_alias=alias.def',
        );
        expect(data).toEqual(expected);
    });

    it('getEditLogForResource calls the base URL without query params', async () => {
        const expected = {
            modified_on: null,
            modified_by: null,
        } as const;

        fetchMock.mockResolvedValueOnce(makeFetchResponse(true, 200, expected));

        const data = await getEditLogForResource('RESOURCE-1');

        expect(fetchMock.mock.calls[0]?.[0]).toBe(
            'https://example.test/resources/RESOURCE-1/edit-log',
        );
        expect(data).toEqual(expected);
    });

    it('propagates an error when fetch returns a non-ok Response', async () => {
        const notFound = makeFetchResponse(false, 404, {
            modified_on: null,
            modified_by: null,
            error: 'Not Found',
        });

        fetchMock.mockResolvedValueOnce(notFound);

        await expect(getEditLogForTile('r404', 't404')).rejects.toThrow(
            'Failed to load edit information: 404',
        );
    });
});
