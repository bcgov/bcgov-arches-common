import { beforeAll, vi } from 'vitest';

beforeAll(() => {
    vi.mock('arches', () => ({
        // Provide a minimal arches shape so module-level code that reads
        // arches.urls (e.g. geojson-feature-collection/api.ts) doesn't crash.
        default: { urls: {} },
    }));

    vi.mock('vue3-gettext', () => ({
        useGettext: () => ({
            $gettext: (text: string) => text,
        }),
    }));
});
