<script setup lang="ts">
import { ref } from 'vue';
import MapDropZoneWidgetEditor from '@/bcgov_arches_common/widgets/MapDropZoneWidget/components/MapDropZoneWidgetEditor/MapDropZoneWidgetEditor.vue';
import SimpleMap from '@/bcgov_arches_common/widgets/SimpleMap/SimpleMap.vue';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

import { EDIT, VIEW } from '@/arches_component_lab/widgets/constants.ts';
import type { WidgetMode } from '@/arches_component_lab/widgets/types.ts';

import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

const { mode, nodeAlias, graphSlug, cardXNodeXWidgetData, aliasedNodeData } =
    defineProps<{
        mode: WidgetMode;
        nodeAlias: string;
        graphSlug: string;
        cardXNodeXWidgetData: GeoJSONFeatureCollectionCardXNodeXWidgetData;
        aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
    }>();

const emit = defineEmits(['update:value']);

const aliasedNodeDataForDisplay = ref(aliasedNodeData);

function updateGeometries(newValue: GeoJSONFeatureCollectionValue) {
    aliasedNodeDataForDisplay.value = newValue;
    emit('update:value', newValue);
}
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
                :aliased-node-data="aliasedNodeData"
                @update:value="updateGeometries($event)" />
        </div>

        <div
            style="
                display: inline-block;
                width: 75%;
                max-height: 500px;
                max-width: 750px;
                vertical-align: top;
                overflow: clip;
            ">
            <SimpleMap
                :graph-slug="graphSlug"
                :node-alias="nodeAlias"
                :mode="VIEW"
                :card-x-node-x-widget-data="cardXNodeXWidgetData"
                :aliased-node-data="aliasedNodeDataForDisplay" />
        </div>
    </div>
</template>
