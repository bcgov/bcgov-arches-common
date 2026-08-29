import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import type { FeatureCollection } from 'geojson';

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports of the mocked modules.
// ---------------------------------------------------------------------------

vi.mock('@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts', () => ({
    processFileGeometry: vi.fn(),
}));

vi.mock('uuidesm', () => ({
    v4: vi.fn().mockReturnValue('generated-uuid'),
    // Use a real UUID-format check so existing valid UUIDs are preserved and
    // non-UUID strings (e.g. 'existing-id', 'gc-feat') are flagged for replacement.
    validate: vi.fn().mockImplementation(
        (id: unknown) =>
            typeof id === 'string' &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                id,
            ),
    ),
}));

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

import MapDropZoneWidgetEditor from './MapDropZoneWidgetEditor.vue';
import { processFileGeometry } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts';
import type { PrimeVueMapFile } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/types.ts';
import { v4 } from 'uuidesm';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const POINT_FC: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: '11111111-1111-1111-1111-111111111111',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        },
    ],
};

const FC_NO_ID: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [1, 2] },
            properties: {},
        },
    ],
};

const GEOMETRY_COLLECTION_FC: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: 'gc-feat',
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    { type: 'Point', coordinates: [0, 0] },
                    {
                        type: 'LineString',
                        coordinates: [
                            [0, 0],
                            [1, 1],
                        ],
                    },
                ],
            },
            properties: { source: 'gc' },
        },
    ],
};

const CARD_DATA = {
    node: { nodeid: 'node-123', alias: 'my-node' },
    config: {},
} as any;

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

// FileUpload renders its #content slot so MapDropZone and FileList are mounted.
const FileUploadStub = {
    name: 'FileUpload',
    emits: ['select'],
    template: `<div class="p-fileupload"><slot name="content" :remove-file-callback="() => {}" /></div>`,
};

const MapDropZoneStub = {
    name: 'MapDropZone',
    props: ['openFileChooser', 'cardXNodeXWidgetData'],
    template: '<div class="map-drop-zone-stub" />',
};

const FileListStub = {
    name: 'FileList',
    props: ['files'],
    emits: ['remove'],
    template: '<div class="file-list-stub" />',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePrimeVueFile(name: string): PrimeVueMapFile {
    return Object.assign(new File(['content'], name), {
        objectURL: `blob:${name}`,
    });
}

function mountEditor(props: Record<string, unknown> = {}) {
    return mount(MapDropZoneWidgetEditor, {
        props: {
            nodeAlias: 'my-node',
            aliasedNodeData: undefined,
            cardXNodeXWidgetData: CARD_DATA,
            ...props,
        },
        global: {
            stubs: {
                FileUpload: FileUploadStub,
                MapDropZone: MapDropZoneStub,
                FileList: FileListStub,
            },
        },
    });
}

async function triggerSelect(
    wrapper: ReturnType<typeof mountEditor>,
    files: PrimeVueMapFile[],
) {
    wrapper.findComponent({ name: 'FileUpload' }).vm.$emit('select', { files });
    await flushPromises();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MapDropZoneWidgetEditor', () => {
    beforeEach(() => {
        vi.mocked(processFileGeometry).mockReset();
        vi.mocked(processFileGeometry).mockResolvedValue(undefined);
        vi.mocked(v4 as () => string).mockReset();
        vi.mocked(v4 as () => string).mockReturnValue('generated-uuid');
    });

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    it('mounts without errors', () => {
        mountEditor();
    });

    it('renders the MapDropZone child component', () => {
        const wrapper = mountEditor();
        expect(wrapper.findComponent(MapDropZoneStub).exists()).toBe(true);
    });

    it('renders the FileList child component', () => {
        const wrapper = mountEditor();
        expect(wrapper.findComponent(FileListStub).exists()).toBe(true);
    });

    // ------------------------------------------------------------------
    // File selection — processFileGeometry integration
    // ------------------------------------------------------------------

    it('calls processFileGeometry once per selected file', async () => {
        const wrapper = mountEditor();
        const files = [makePrimeVueFile('a.json'), makePrimeVueFile('b.json')];
        await triggerSelect(wrapper, files);
        expect(processFileGeometry).toHaveBeenCalledTimes(2);
    });

    it('passes each File object to processFileGeometry', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        const file = makePrimeVueFile('map.geojson');
        await triggerSelect(wrapper, [file]);
        expect(processFileGeometry).toHaveBeenCalledWith(file);
    });

    it('does not emit update:aliasedNodeData when processFileGeometry returns undefined', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(undefined);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('bad.csv')]);
        expect(wrapper.emitted('update:aliasedNodeData')).toBeUndefined();
    });

    // ------------------------------------------------------------------
    // update:aliasedNodeData event structure
    // ------------------------------------------------------------------

    it('emits update:aliasedNodeData after a successful file selection', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        expect(wrapper.emitted('update:aliasedNodeData')).toHaveLength(1);
    });

    it('emitted node_value is a FeatureCollection', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.node_value.type).toBe('FeatureCollection');
    });

    it('emitted node_value contains the features from processFileGeometry', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.node_value.features).toHaveLength(1);
        expect(emitted.node_value.features[0].id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('emitted details contains the pending file entry', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        const file = makePrimeVueFile('map.geojson');
        await triggerSelect(wrapper, [file]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.details).toHaveLength(1);
        expect(emitted.details[0].name).toBe('map.geojson');
    });

    it('pending file entry includes node_id from cardXNodeXWidgetData', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.details[0].node_id).toBe('node-123');
    });

    // ------------------------------------------------------------------
    // Feature ID assignment
    // ------------------------------------------------------------------

    it('keeps existing IDs on features that already have one', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.node_value.features[0].id).toBe('11111111-1111-1111-1111-111111111111');
    });

    it('assigns a generated ID to features that have no id', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(FC_NO_ID);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.node_value.features[0].id).toBe('generated-uuid');
    });

    it('replaces a non-UUID id with a generated UUID', async () => {
        const fcWithArbitraryId: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'not-a-uuid',
                    geometry: { type: 'Point', coordinates: [0, 0] },
                    properties: {},
                },
            ],
        };
        vi.mocked(processFileGeometry).mockResolvedValue(fcWithArbitraryId);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        expect(emitted.node_value.features[0].id).toBe('generated-uuid');
    });

    // ------------------------------------------------------------------
    // GeometryCollection expansion
    // ------------------------------------------------------------------

    it('expands a GeometryCollection feature into individual features', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        // One GC feature with 2 geometries → 2 individual features
        expect(emitted.node_value.features).toHaveLength(2);
    });

    it('expanded features have the concrete geometry types, not GeometryCollection', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        const types = emitted.node_value.features.map(
            (f: any) => f.geometry.type,
        );
        expect(types).toContain('Point');
        expect(types).toContain('LineString');
        expect(types.includes('GeometryCollection')).toBe(false);
    });

    it('expanded features inherit non-geometry properties from the parent feature', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        for (const feature of emitted.node_value.features) {
            expect(feature.properties.source).toBe('gc');
        }
    });

    it('each expanded GC feature gets a new id, not the parent feature id', async () => {
        // Before the fix, expanded features inherited the parent's id via spread.
        // After the fix, each gets id: v4() explicitly.
        // The first v4() call in onSelect is geometrySourceId; the next two are
        // the expansion IDs. Use proper UUID-format strings so they pass validate
        // and are not replaced by a second v4() call in the validation step.
        vi.mocked(v4 as () => string)
            .mockReturnValueOnce('00000000-0000-0000-0000-000000000001') // geometrySourceId
            .mockReturnValueOnce('00000000-0000-0000-0000-000000000002') // sub-geom 1
            .mockReturnValueOnce('00000000-0000-0000-0000-000000000003'); // sub-geom 2
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        const ids: string[] = emitted.node_value.features.map((f: any) => f.id);
        // No expanded feature should carry the original parent's id
        expect(ids.includes('gc-feat')).toBe(false);
        // Each feature should have received its own generated id
        expect(ids).toContain('00000000-0000-0000-0000-000000000002');
        expect(ids).toContain('00000000-0000-0000-0000-000000000003');
    });

    it('expanded GC features each receive a distinct id', async () => {
        vi.mocked(v4 as () => string)
            .mockReturnValueOnce('00000000-0000-0000-0000-000000000001') // geometrySourceId
            .mockReturnValueOnce('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') // sub-geom 1
            .mockReturnValueOnce('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'); // sub-geom 2
        vi.mocked(processFileGeometry).mockResolvedValue(
            GEOMETRY_COLLECTION_FC,
        );
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('shapes.kml')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        const ids: string[] = emitted.node_value.features.map((f: any) => f.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('non-GeometryCollection features pass through unchanged', async () => {
        const mixedFC: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'point-1',
                    geometry: { type: 'Point', coordinates: [5, 6] },
                    properties: {},
                },
                {
                    type: 'Feature',
                    id: 'gc-1',
                    geometry: {
                        type: 'GeometryCollection',
                        geometries: [
                            { type: 'Point', coordinates: [7, 8] },
                            { type: 'Point', coordinates: [9, 10] },
                        ],
                    },
                    properties: {},
                },
            ],
        };
        vi.mocked(processFileGeometry).mockResolvedValue(mixedFC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('mixed.kml')]);
        const emitted = wrapper.emitted('update:aliasedNodeData')![0][0] as any;
        // 1 Point + 1 GC(2 geoms) → 3 total
        expect(emitted.node_value.features).toHaveLength(3);
    });

    // ------------------------------------------------------------------
    // File removal
    // ------------------------------------------------------------------

    it("removes the file's features from node_value when the file is removed", async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);

        // Confirm the feature is present after selection
        const beforeRemove = wrapper.emitted(
            'update:aliasedNodeData',
        )![0][0] as any;
        expect(beforeRemove.node_value.features).toHaveLength(1);

        // Trigger removal of file at index 0
        wrapper.findComponent(FileListStub).vm.$emit('remove', null, 0);
        await flushPromises();

        const afterRemove = wrapper.emitted(
            'update:aliasedNodeData',
        )![1][0] as any;
        expect(afterRemove.node_value.features).toHaveLength(0);
    });

    it('emits update:aliasedNodeData again after file removal', async () => {
        vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
        const wrapper = mountEditor();
        await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);

        wrapper.findComponent(FileListStub).vm.$emit('remove', null, 0);
        await flushPromises();

        expect(wrapper.emitted('update:aliasedNodeData')).toHaveLength(2);
    });

    // ------------------------------------------------------------------
    // Warning message
    // ------------------------------------------------------------------

    describe('warning message', () => {
        // Fake-timer tests cannot use triggerSelect() because flushPromises()
        // internally uses setTimeout, which is also faked and would deadlock.
        // Instead the 'select' event is emitted directly and we drain the
        // microtask queue with several Promise.resolve() yields before
        // asserting or advancing fake time.
        async function emitSelectAndFlush(
            wrapper: ReturnType<typeof mountEditor>,
            files: PrimeVueMapFile[],
        ) {
            wrapper
                .findComponent({ name: 'FileUpload' })
                .vm.$emit('select', { files });
            // Drain Promise.all + mocked-promise resolutions (all microtasks)
            for (let i = 0; i < 10; i++) await Promise.resolve();
            await nextTick();
        }

        afterEach(() => vi.useRealTimers());

        it('no warning is shown on mount', () => {
            const wrapper = mountEditor();
            expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        });

        it('shows a warning when no geometry is found in any selected file', async () => {
            const wrapper = mountEditor();
            await triggerSelect(wrapper, [makePrimeVueFile('bad.csv')]);
            expect(wrapper.find('[role="alert"]').exists()).toBe(true);
        });

        it('warning message mentions each supported format', async () => {
            const wrapper = mountEditor();
            await triggerSelect(wrapper, [makePrimeVueFile('bad.csv')]);
            const text = wrapper.find('[role="alert"]').text();
            for (const fmt of ['.geojson', '.json', '.kml', '.shp', '.zip']) {
                expect(text).toContain(fmt);
            }
        });

        it('does not show a warning after a successful file selection', async () => {
            vi.mocked(processFileGeometry).mockResolvedValue(POINT_FC);
            const wrapper = mountEditor();
            await triggerSelect(wrapper, [makePrimeVueFile('map.geojson')]);
            expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        });

        it('clicking × dismisses the warning immediately', async () => {
            const wrapper = mountEditor();
            await triggerSelect(wrapper, [makePrimeVueFile('bad.csv')]);
            expect(wrapper.find('[role="alert"]').exists()).toBe(true);

            await wrapper
                .find('.map-drop-zone-warning-dismiss')
                .trigger('click');

            expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        });

        it('warning is still visible just before 5 seconds elapse', async () => {
            vi.useFakeTimers();
            const wrapper = mountEditor();
            await emitSelectAndFlush(wrapper, [makePrimeVueFile('bad.csv')]);

            expect(wrapper.find('[role="alert"]').exists()).toBe(true);

            vi.advanceTimersByTime(4999);
            await nextTick();

            expect(wrapper.find('[role="alert"]').exists()).toBe(true);
        });

        it('warning auto-clears after 5 seconds', async () => {
            vi.useFakeTimers();
            const wrapper = mountEditor();
            await emitSelectAndFlush(wrapper, [makePrimeVueFile('bad.csv')]);

            expect(wrapper.find('[role="alert"]').exists()).toBe(true);

            vi.advanceTimersByTime(5000);
            await nextTick();

            expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        });

        it('selecting a second file with no geometry resets the auto-clear timer', async () => {
            vi.useFakeTimers();
            const wrapper = mountEditor();

            // First bad file – starts 5 s timer
            await emitSelectAndFlush(wrapper, [makePrimeVueFile('bad1.csv')]);

            // 4 s into the first timer
            vi.advanceTimersByTime(4000);

            // Second bad file – resets timer to 5 s from now
            await emitSelectAndFlush(wrapper, [makePrimeVueFile('bad2.csv')]);

            // 4 s more (8 s total, but only 4 s since reset) – should persist
            vi.advanceTimersByTime(4000);
            await nextTick();
            expect(wrapper.find('[role="alert"]').exists()).toBe(true);

            // 1 more second (5 s since the reset) – should now be gone
            vi.advanceTimersByTime(1001);
            await nextTick();
            expect(wrapper.find('[role="alert"]').exists()).toBe(false);
        });
    });

    it('keeps features from other files when only one file is removed', async () => {
        const fc1: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
                    geometry: { type: 'Point', coordinates: [0, 0] },
                    properties: {},
                },
            ],
        };
        const fc2: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
                    geometry: { type: 'Point', coordinates: [1, 1] },
                    properties: {},
                },
            ],
        };

        vi.mocked(processFileGeometry)
            .mockResolvedValueOnce(fc1)
            .mockResolvedValueOnce(fc2);

        const wrapper = mountEditor();
        await triggerSelect(wrapper, [
            makePrimeVueFile('a.geojson'),
            makePrimeVueFile('b.geojson'),
        ]);

        // Remove the first file (feat-A)
        wrapper.findComponent(FileListStub).vm.$emit('remove', null, 0);
        await flushPromises();

        const afterRemove = wrapper.emitted(
            'update:aliasedNodeData',
        )![1][0] as any;
        const ids = afterRemove.node_value.features.map((f: any) => f.id);
        expect(ids.includes('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')).toBe(false);
        expect(ids).toContain('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
    });
});
