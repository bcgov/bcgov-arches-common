<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import MapDropZoneWidgetEditor from '@/bcgov_arches_common/widgets/MapDropZoneWidget/components/MapDropZoneWidgetEditor/MapDropZoneWidgetEditor.vue';
import SimpleMapWidget from '@/bcgov_arches_common/widgets/SimpleMapWidget/SimpleMapWidget.vue';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

import { EDIT, VIEW } from '@/arches_vue_components/widgets/constants.ts';
import type { WidgetMode } from '@/arches_vue_components/widgets/types.ts';

import type {
    FeatureCollection,
    GeoJSONFeatureCollectionValue,
} from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import { blankGeoJSONValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/utils.ts';

const props = defineProps<{
    mode: WidgetMode;
    nodeAlias: string;
    graphSlug: string;
    cardXNodeXWidgetData: GeoJSONFeatureCollectionCardXNodeXWidgetData;
    aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
}>();

const { mode, nodeAlias, graphSlug, cardXNodeXWidgetData } = props;

const emit = defineEmits<{
    'update:aliasedNodeData': [updatedValue: GeoJSONFeatureCollectionValue];
    'update:value': [updatedValue: FeatureCollection | null];
    initialized: [updatedValue: GeoJSONFeatureCollectionValue];
}>();

// GenericWidget keeps the widget behind a skeleton until this fires, and stores
// the payload as the baseline it diffs against for dirty state. New in arches-vue-components@2.0.2
onMounted(() =>
    emit('initialized', props.aliasedNodeData ?? blankGeoJSONValue()),
);

const aliasedNodeDataFromFiles = ref(blankGeoJSONValue());

function updateGeometries(newValue: GeoJSONFeatureCollectionValue) {
    aliasedNodeDataFromFiles.value = newValue;
    emit('update:aliasedNodeData', newValue);
    emit('update:value', newValue.node_value);
}

const concatenatedAliasedNodeData = computed<GeoJSONFeatureCollectionValue>(
    () => {
        return {
            ...aliasedNodeDataFromFiles.value,
            node_value: {
                ...aliasedNodeDataFromFiles.value?.node_value,
                type: 'FeatureCollection',
                // Combine features from both sources
                features: [
                    ...(aliasedNodeDataFromFiles.value?.node_value?.features ||
                        []),
                    ...(props.aliasedNodeData?.node_value?.features || []),
                ],
            },
        };
    },
);
</script>

<template>
    <div>
        <div
            style="
                display: inline-block;
                width: 20%;
                margin-right: 2rem;
                vertical-align: top;
            ">
            <MapDropZoneWidgetEditor
                v-if="mode === EDIT"
                :card-x-node-x-widget-data="cardXNodeXWidgetData"
                :node-alias="nodeAlias"
                :aliased-node-data="props.aliasedNodeData"
                @update:aliased-node-data="updateGeometries($event)" />
        </div>

        <div
            style="
                display: inline-block;
                width: var(--map-width, 75%);
                max-height: var(--map-max-height, 500px);
                max-width: var(--map-max-width, 750px);
                vertical-align: top;
                overflow: clip;
            ">
            <SimpleMapWidget
                :graph-slug="graphSlug"
                :node-alias="nodeAlias"
                :mode="VIEW"
                :card-x-node-x-widget-data="cardXNodeXWidgetData"
                :aliased-node-data="concatenatedAliasedNodeData" />
        </div>
    </div>
</template>
