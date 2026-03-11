<script setup lang="ts">
import { fetchSystemMapData } from '@/bcgov_arches_common/widgets/SimpleMap/api.ts';
import { computed, ref, toRefs, shallowRef, watchEffect } from 'vue';

import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import { VIEW } from '@/arches_component_lab/widgets/constants.ts';
import type { WidgetMode } from '@/arches_component_lab/widgets/types.ts';
import type { MapData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

import MapView from '@/bcgov_arches_common/widgets/SimpleMap/components/SimpleMapView.vue';
import ProgressSpinner from 'primevue/progressspinner';
import { fetchCardXNodeXWidgetData } from '@/arches_component_lab/generics/GenericWidget/api.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

const mapData = ref<MapData | null | undefined>(null);
const props = defineProps<{
    graphSlug: string;
    nodeAlias: string;
    mode: WidgetMode;
    cardXNodeXWidgetData?: GeoJSONFeatureCollectionCardXNodeXWidgetData;
    aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
}>();
const { graphSlug, nodeAlias, mode, cardXNodeXWidgetData, aliasedNodeData } =
    toRefs(props);

// From GenericWidget
const isLoading = computed(() => {
    return mapDataLoading.value || widgetConfigLoading.value;
});
const mapDataLoading = ref(false);
const widgetConfigLoading = ref(false);

const resolvedCardXNodeXWidgetData = shallowRef<GeoJSONFeatureCollectionCardXNodeXWidgetData | undefined>(cardXNodeXWidgetData.value);
const configurationError = ref<Error>();

watchEffect(async () => {
    if (mapData.value) {
        return;
    }
    mapDataLoading.value = true;
    try {
        mapData.value = await fetchSystemMapData();
    } catch (error) {
        console.log(error);
        configurationError.value = error as Error;
    } finally {
        mapDataLoading.value = false;
    }
});

// Copied from GenericWidget - should remove if/when folded into component lab

watchEffect(async () => {
    if (resolvedCardXNodeXWidgetData.value) {
        return;
    }

    widgetConfigLoading.value = true;

    try {
        resolvedCardXNodeXWidgetData.value = await fetchCardXNodeXWidgetData(
            graphSlug.value,
            nodeAlias.value,
        ) as GeoJSONFeatureCollectionCardXNodeXWidgetData;
    } catch (error) {
        console.log(error);
        configurationError.value = error as Error;
    } finally {
        widgetConfigLoading.value = false;
    }
});
</script>
<template>
    <ProgressSpinner
        v-if="isLoading"
        :style="{ width: '2rem', height: '2rem' }" />
    <MapView
        v-if="mode === VIEW"
        :graph-slug="graphSlug"
        :node-alias="nodeAlias"
        :map-data="mapData"
        :card-x-node-x-widget-data="resolvedCardXNodeXWidgetData"
        :aliased-node-data="aliasedNodeData"></MapView>
</template>
