<script setup lang="ts">
import { fetchSystemMapData } from '@/bcgov_arches_common/widgets/SimpleMapWidget/api.ts';
import { type SimpleMapConfiguration } from '@/bcgov_arches_common/widgets/SimpleMapWidget/types.ts';
import { computed, inject, ref, toRefs, watchEffect } from 'vue';

import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import { VIEW } from '@/arches_vue_components/widgets/constants.ts';
import type { WidgetMode } from '@/arches_vue_components/widgets/types.ts';
import type { MapData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

import MapView from '@/bcgov_arches_common/widgets/SimpleMapWidget/components/SimpleMapView.vue';
import ProgressSpinner from 'primevue/progressspinner';
import { useWidgetConfig } from '@/bcgov_arches_common/composables/useWidgetConfig.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';

const mapData = ref<MapData | null | undefined>(null);
const props = withDefaults(
    defineProps<{
        graphSlug: string;
        nodeAlias: string;
        mode: WidgetMode;
        cardXNodeXWidgetData?: GeoJSONFeatureCollectionCardXNodeXWidgetData;
        aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
        useUtmCoords?: boolean;
    }>(),
    {
        useUtmCoords: false,
    },
);
const { graphSlug, nodeAlias, mode, cardXNodeXWidgetData, aliasedNodeData } =
    toRefs(props);

const simpleMapConfig = inject('simpleMapConfig', {} as SimpleMapConfiguration);
// From GenericWidget
const isLoading = computed(() => {
    return mapDataLoading.value || widgetConfigLoading.value;
});
const mapDataLoading = ref(false);

const {
    config: resolvedCardXNodeXWidgetData,
    isLoading: widgetConfigLoading,
    error: configurationError,
} = useWidgetConfig<GeoJSONFeatureCollectionCardXNodeXWidgetData>(
    graphSlug,
    nodeAlias,
    cardXNodeXWidgetData.value,
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
        :mark-centroid="simpleMapConfig.showCentroidMarker"
        :use-utm-coords="useUtmCoords">
    </MapView>
</template>
