<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { v4, validate as uuidValidate } from 'uuidesm';

import FileUpload from 'primevue/fileupload';

import MapDropZone from '@/bcgov_arches_common/widgets/MapDropZoneWidget/components/MapDropZoneWidgetEditor/components/MapDropZone.vue';

import type { FileReference } from '@/arches_component_lab/datatypes/file-list/types.ts';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type {
    MapFileData,
    PrimeVueMapFile,
} from '@/bcgov_arches_common/widgets/MapDropZoneWidget/types.ts';
import type { FeatureCollection, Feature } from 'geojson';
import { processFileGeometry } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/utils.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import FileList from '@/arches_component_lab/widgets/FileListWidget/components/FileListWidgetEditor/components/FileList.vue';

const { aliasedNodeData, nodeAlias, cardXNodeXWidgetData } = defineProps<{
    aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
    nodeAlias: string;
    cardXNodeXWidgetData: GeoJSONFeatureCollectionCardXNodeXWidgetData;
}>();

const emit = defineEmits<{
    (event: 'update:value', updatedValue: GeoJSONFeatureCollectionValue): void;
}>();

const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null);

const savedFiles = ref<FileReference[]>([]);
const pendingFiles = ref<MapFileData[]>([]);

const allowedFileTypes = ref();
const currentValues = ref();
// const acceptedFiles = cardXNodeXWidgetData.config.acceptedFiles;
const acceptedFiles = '';

watchEffect(() => {
    allowedFileTypes.value = acceptedFiles != '' ? acceptedFiles : null;

    if (
        aliasedNodeData &&
        aliasedNodeData.node_value?.features &&
        aliasedNodeData.node_value.features.length > 0
    ) {
        currentValues.value = aliasedNodeData.node_value;

        // if (aliasedNodeData.node_value) {
        //     savedFiles.value = aliasedNodeData.node_value.map((file) => {
        //         return {
        //             ...file,
        //             node_id: cardXNodeXWidgetData.node.nodeid,
        //         };
        //     });
        // } else {
        //     savedFiles.value = [];
        // }
    }
});

function emitUpdatedValue() {
    const allFiles = [
        ...savedFiles.value,
        ...pendingFiles.value,
    ] as FileReference[];
    const newValue = {
        display_value: JSON.stringify(allFiles),
        node_value: nodeValue.value,
        details: [...pendingFiles.value],
    };
    console.log(`Emitting: ${newValue}`);
    emit('update:value', newValue);
}

const nodeValue = ref({
    type: 'FeatureCollection',
    features: [] as Feature[],
} satisfies FeatureCollection);

async function onSelect(event: { files: PrimeVueMapFile[] }): Promise<void> {
    const results = await Promise.all(
        event.files.map((file) =>
            processFileGeometry(file).then((geometries) => ({
                file,
                geometries,
            })),
        ),
    );
    // Process results after ALL promises are resolved
    for (const { file, geometries } of results) {
        if (!geometries) continue;

        // Ensure each feature has a valid uuid
        geometries.features = geometries.features.map((feature) => {
            return uuidValidate(feature?.id)
                ? feature
                : { ...feature, id: v4() };
        });

        pendingFiles.value = [
            ...pendingFiles.value,
            {
                name: file.name,
                size: file.size,
                type: file.type,
                url: file.objectURL,
                file,
                node_id: cardXNodeXWidgetData.node.nodeid, // or cardXNodeXWidgetData.value…
                geometrySourceId: v4(),
                geometries: geometries as FeatureCollection,
            },
        ];

        nodeValue.value.features = [
            ...(aliasedNodeData?.node_value?.features ?? []),
            ...nodeValue.value.features,
            ...geometries.features,
        ];
    }

    // for (const file of event.files) {
    //     processFileGeometry(file).then(
    //         (geometries: FeatureCollection | undefined) => {
    //             if (geometries) {
    //                 // This sets geometry id for each feature if it doesn't already exist
    //                 geometries.features = geometries.features.map((feature) => {
    //                     return feature?.id
    //                         ? feature
    //                         : { ...feature, id: uuid.generate() };
    //                 });
    //                 pendingFiles.value.push({
    //                     name: file.name,
    //                     size: file.size,
    //                     type: file.type,
    //                     url: file.objectURL,
    //                     file: file,
    //                     node_id: cardXNodeXWidgetData.node.nodeid,
    //                     geometrySourceId: uuid.generate(),
    //                     geometries: geometries as FeatureCollection,
    //                 });
    //                 nodeValue.value.features = [
    //                     ...nodeValue.value.features,
    //                     ...geometries.features,
    //                 ];
    //             }
    //         },
    //     );
    // }

    emitUpdatedValue();
}

function onRemovePendingFile(
    fileIndex: number,
    removeFileCallback: (index: number) => void,
): void {
    removeFileCallback(fileIndex);
    const fileToRemove = pendingFiles.value[fileIndex];
    const geometriesIdsToRemove = fileToRemove.geometries.features.map(
        (feature) => feature.id,
    );
    pendingFiles.value.splice(fileIndex, 1);
    pendingFiles.value = [...pendingFiles.value];
    nodeValue.value.features = nodeValue.value.features.filter(
        (feature) => !geometriesIdsToRemove.includes(feature.id),
    );
    emitUpdatedValue();
}

function openFileChooser(): void {
    // @ts-expect-error FileUpload does not have a type definition for $el
    const rootElement = fileUploadRef.value?.$el;
    rootElement?.querySelector('input[type="file"]')?.click();
}
</script>

<template>
    <FileUpload
        ref="fileUploadRef"
        :accept="allowedFileTypes"
        :name="nodeAlias"
        :model-value="aliasedNodeData?.node_value"
        :multiple="true"
        :show-cancel-button="false"
        :show-upload-button="false"
        :with-credentials="true"
        :custom-upload="true"
        @select="onSelect($event)">
        <template #content="{ removeFileCallback }">
            <MapDropZone
                :card-x-node-x-widget-data="cardXNodeXWidgetData"
                :open-file-chooser="openFileChooser" />
            <FileList
                :files="pendingFiles as unknown as FileReference[]"
                @remove="
                    (_fileReference, fileIndex) =>
                        onRemovePendingFile(fileIndex, removeFileCallback)
                " />
        </template>
    </FileUpload>
</template>

<style scoped>
:deep(.p-fileupload-header) {
    display: none;
}
:deep(.p-fileupload-content) {
    padding: 0;
}
</style>
