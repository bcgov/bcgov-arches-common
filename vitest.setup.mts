import { beforeAll, vi } from 'vitest';

// maplibre-gl calls window.URL.createObjectURL at module-load time to set its
// worker URL. jsdom does not implement this API, so stub it before any test
// file's import chain can trigger the maplibre-gl module.
if (typeof window !== 'undefined') {
    window.URL.createObjectURL = vi.fn();
    window.URL.revokeObjectURL = vi.fn();
}

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

    // maplibre-gl calls window.URL.createObjectURL() during module
    // initialisation, which jsdom does not implement.  Provide a minimal stub
    // so any test file that does not need the real maplibre-gl API can import
    // Vue components that depend on it without a runtime error.
    // Individual test files (e.g. SimpleMap/utils.test.ts) supply their own
    // more detailed vi.mock('maplibre-gl', ...) which overrides this one.
    vi.mock('maplibre-gl', () => ({
        default: {},
    }));
});
