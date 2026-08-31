import { beforeAll, vi } from 'vitest';

// maplibre-gl calls window.URL.createObjectURL at module-load time; stub it
// before any import chain triggers the module (jsdom doesn't implement it).
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

    // Minimal stub so components importing maplibre-gl don't crash in jsdom.
    // Test files that need the real API supply their own vi.mock override.
    vi.mock('maplibre-gl', () => ({
        default: {},
    }));

    // FileList.vue is from a pip-installed package outside the project root in
    // CI; its own imports (e.g. primevue/image) can't be resolved by Vite from
    // that external path. A factory mock prevents Vite from transforming it.
    vi.mock(
        '@/arches_vue_components/widgets/FileListWidget/components/FileListWidgetEditor/components/FileList.vue',
        () => ({
            default: {
                name: 'FileList',
                props: ['files'],
                emits: ['remove'],
                template: '<div />',
            },
        }),
    );
});
