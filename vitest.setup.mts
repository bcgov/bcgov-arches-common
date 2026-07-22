import { beforeAll, vi } from 'vitest';

beforeAll(() => {
    vi.mock('arches', () => ({
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
