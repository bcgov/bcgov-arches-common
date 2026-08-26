<script setup lang="ts">
import { fetchSystemMapData } from '@/bcgov_arches_common//components/SimpleMap/api.ts';
import { computed, ref, watchEffect } from 'vue';

import type { AliasedGeojsonFeatureCollectionNode } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import { VIEW } from '@/arches_vue_components/widgets/constants.ts';
import type { WidgetMode } from '@/arches_vue_components/widgets/types.ts';
import type { CardXNodeXWidgetData } from '@/arches_vue_components/types.ts';
import type { MapData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

import MapView from '@/bcgov_arches_common//components/SimpleMap/components/SimpleMapView.vue';
import ProgressSpinner from 'primevue/progressspinner';
import { useWidgetConfig } from '@/bcgov_arches_common/composables/useWidgetConfig.ts';

const mapData = ref<MapData | null | undefined>(null);
const {
    graphSlug,
    nodeAlias,
    mode,
    cardXNodeXWidgetData,
    aliasedNodeData,
    useUtmCoords = false,
} = defineProps<{
    graphSlug: string;
    nodeAlias: string;
    mode: WidgetMode;
    cardXNodeXWidgetData?: CardXNodeXWidgetData;
    aliasedNodeData: AliasedGeojsonFeatureCollectionNode | undefined;
    useUtmCoords?: boolean;
}>();

// From GenericWidget
const isLoading = computed(() => {
    return mapDataLoading.value || widgetConfigLoading.value;
});
const mapDataLoading = ref(true);

const {
    config: resolvedCardXNodeXWidgetData,
    isLoading: widgetConfigLoading,
    error: configurationError,
} = useWidgetConfig(
    () => graphSlug,
    () => nodeAlias,
    cardXNodeXWidgetData,
);

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
        :aliased-node-data="aliasedNodeData"
        :use-utm-coords="useUtmCoords"></MapView>
</template>
