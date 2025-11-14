<script setup lang="ts">
import maplibregl, {
    type Map as MapLibreMap,
    type SourceSpecification,
} from 'maplibre-gl';
import {
    watch,
    onMounted,
    type Ref,
    ref,
    toRefs,
    shallowRef,
    computed,
} from 'vue';
import centroid from '@turf/centroid';
import bbox from '@turf/bbox';
import type { AllGeoJSON } from '@turf/helpers';
import { find } from 'underscore';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { Feature, FeatureCollection, Position } from 'geojson';
import type { GeoJsonCardXNodeXWidgetData } from '@/bcgov_arches_common/widgets/SimpleMap/types.ts';
import {
    buildLayersForFeature,
    removeLayersUsingSource,
} from '@/bcgov_arches_common/widgets/SimpleMap/utils.ts';
import type {
    MapData,
    MapLayer,
} from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type {
    LayerSpecificationType,
    StyleSpecificationType,
    MapLibreMapSourcesType,
} from '@/bcgov_arches_common/widgets/SimpleMap/types.ts';
import type { GeoJSONFeatureCollectionValue } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { MapFileData } from '@/bcgov_arches_common/widgets/MapDropZoneWidget/types.ts';

const props = defineProps<{
    graphSlug: string;
    nodeAlias: string;
    cardXNodeXWidgetData:
        | GeoJSONFeatureCollectionCardXNodeXWidgetData
        | undefined;
    mapData: MapData | undefined | null;
    aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
}>();
const { graphSlug, nodeAlias, cardXNodeXWidgetData, mapData, aliasedNodeData } =
    toRefs(props);

const geometry = computed<Feature | undefined>(() => {
    return aliasedNodeData?.value?.node_value?.features?.[0];
});

const allGeometries = computed<FeatureCollection | undefined>(() => {
    const geometriesFromFiles = aliasedNodeData?.value?.details.reduce(
        (coll, file) => [...coll, ...file.geometries.features],
        [],
    );
    return { type: 'FeatureCollection', features: geometriesFromFiles };
});

const hasGeometry = computed<boolean>(() => {
    return geometry.value !== undefined;
});

const mapLoaded = ref(false);

// const defaultCenter = ref<[number, number]>([-123.1207, 49.2827]); // Vancouver (lng, lat)
const defaultCenter = computed<[number, number]>(() => {
    return cardXNodeXWidgetData?.value?.config?.centerX &&
        cardXNodeXWidgetData?.value?.config?.centerY
        ? [
              cardXNodeXWidgetData.value?.config.centerX,
              cardXNodeXWidgetData.value?.config.centerY,
          ]
        : [-123.1207, 49.2827];
});

const center = ref<[number, number]>(defaultCenter.value);

const mapCentre = computed<[number, number]>(() => {
    return (
        aliasedNodeData?.value?.node_value && geometry.value
            ? (centroid(geometry.value)?.geometry?.coordinates ??
              defaultCenter.value)
            : defaultCenter.value
    ) as [number, number];
});

const zoom = ref<number>(3.5);

const mapEl = ref<HTMLDivElement | null>(null);
const map: Ref<MapLibreMap | null> = ref(null);

const styleObj = {
    version: 8,
    name: 'Custom WMS Basemap + Overlays',
    sources: {} as MapLibreMapSourcesType,
    layers: [] as LayerSpecificationType[],
    // Optional: wire up glyphs/sprite if you also use symbol layers elsewhere
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
} satisfies StyleSpecificationType;

const defaultStyle = shallowRef<StyleSpecificationType>(styleObj);

watch(mapData, () => {
    setupMap();
});

function setupMap(): void {
    // dataLoaded.value = true;
    if (!mapEl.value || !mapData.value) return;

    const basemap = find(mapData.value.basemaps, (basemap: MapLayer) => {
        return basemap.addtomap;
    });
    if (
        basemap &&
        basemap.source?.source &&
        basemap.layerdefinitions &&
        defaultStyle.value?.sources &&
        defaultStyle.value.sources[basemap.source.name]
    ) {
        defaultStyle.value.sources[basemap.source.name] = basemap.source
            .source as SourceSpecification;
        defaultStyle.value.layers.push(
            ...(basemap.layerdefinitions as LayerSpecificationType[]),
        );
    }
    if (mapData.value.default_bounds) {
        let c = centroid(mapData.value.default_bounds as unknown as AllGeoJSON)
            .geometry?.coordinates as Position | undefined;
        center.value =
            Array.isArray(c) && c.length >= 2
                ? [c[0], c[1]]
                : defaultCenter.value;
    }

    map.value = new maplibregl.Map({
        container: mapEl.value,
        style: defaultStyle.value,
        center: center.value,
        zoom: zoom.value,
        attributionControl: false,
    });

    map.value.on('load', () => {
        mapLoaded.value = true;
        map.value?.addControl(
            new maplibregl.NavigationControl({ visualizePitch: true }),
            'top-right',
        );
        map.value?.addControl(
            new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }),
        );
        map.value?.addControl(
            new maplibregl.AttributionControl({ compact: true }),
        );
        if (aliasedNodeData?.value?.node_value?.features?.[0]) {
            console.log('Adding geometry from load event');
            updateMapGeometries(aliasedNodeData.value?.details ?? [], []);
        }
    });

    // map.value.on('moveend', () => {
    //     if (!map.value) return;
    //     const c = map.value.getCenter();
    //     center.value = [Number(c.lng.toFixed(5)), Number(c.lat.toFixed(5))];
    //     zoom.value = Number(map.value.getZoom().toFixed(2));
    // });

    const onResize = () => {
        console.log('Resizing');
        map.value?.resize();
    };
    window.addEventListener('resize', onResize);
    // map.value.on('resize', onResize);
}

onMounted(async () => {
    if (!map.value && mapData.value) {
        setupMap();
    }
});

watch(
    () => mapData,
    (mapData, prevMapData) => {
        console.log('mapData updated', mapData);
        console.log('cardXNodeXWidgetData', cardXNodeXWidgetData);
        if (mapData) {
            setupMap();
        }
    },
);

const updateMapGeometries = (
    featuresToAdd: MapFileData[],
    featuresToRemove: MapFileData[],
) => {
    if (!map.value || !mapLoaded.value || !cardXNodeXWidgetData.value) return;

    const mapInstance = map.value;
    featuresToRemove?.forEach((feature) => {
        if (feature.geometrySourceId) {
            const src = mapInstance.getSource(
                feature.geometrySourceId,
            ) as maplibregl.GeoJSONSource;
            src.setData({ type: 'FeatureCollection', features: [] });
            removeLayersUsingSource(
                mapInstance,
                `${feature.geometrySourceId}`,
                true,
            );
        }
    });
    featuresToAdd.forEach((feature) => {
        mapInstance.addSource(feature.geometrySourceId as string, {
            type: 'geojson',
            data: feature.geometries,
        });
        const layers = buildLayersForFeature(
            feature.geometrySourceId,
            feature.geometries,
            cardXNodeXWidgetData as any as GeoJsonCardXNodeXWidgetData,
        );
        layers.forEach((layer) => {
            map.value?.addLayer(layer);
        });

        // new maplibregl.Marker({ color: '#d97706' })
        //     .setLngLat(mapCentre.value)
        //     .setPopup(new maplibregl.Popup().setHTML('<b>Feature centroid</b>'))
        //     .addTo(mapInstance);
    });

    const allFeaturesCollection = allGeometries.value;
    if (
        allFeaturesCollection &&
        (allFeaturesCollection?.features?.length ?? 0 > 0)
    ) {
        const bounds = bbox(allFeaturesCollection);
        map.value.fitBounds(
            [
                [bounds[0], bounds[1]],
                [bounds[2], bounds[3]],
            ],
            {
                padding: 100,
                maxZoom: 15,
            },
        );
    }

    center.value = mapCentre.value;
    console.log('New centre value: ', center.value);
};

watch(
    () => cardXNodeXWidgetData,
    (cardXNodeXWidgetData) => {
        console.log('cardXNodeXWidgetData updated', cardXNodeXWidgetData);
        if (
            cardXNodeXWidgetData &&
            mapData &&
            aliasedNodeData?.value?.node_value?.features?.[0]
        ) {
            updateMapGeometries(aliasedNodeData?.value?.details ?? [], []);
        }
    },
);

watch(
    // () => aliasedNodeData.value?.node_value?.features,
    () => aliasedNodeData.value?.details,
    (features, prevFeature) => {
        console.log('watch feature');
        console.log(features);
        console.log(cardXNodeXWidgetData);
        const prevFeatureIds = prevFeature?.map((f) => f.id) ?? [];
        const newFeatureIds = features?.map((f) => f.id) ?? [];
        const featuresToAdd = features?.filter(
            (feature) => !prevFeatureIds.includes(feature.id),
        );
        const featuresToRemove = prevFeature?.filter(
            (feature) => !newFeatureIds.includes(feature.id),
        );
        console.log(featuresToAdd);
        if (
            ((featuresToAdd?.length ?? 0) || (featuresToRemove?.length ?? 0)) &&
            map.value &&
            aliasedNodeData.value?.node_value
        ) {
            console.log('Updating geometry from watch event');
            updateMapGeometries(featuresToAdd ?? [], featuresToRemove ?? []);
        }
    },
);
</script>
<template>
    <div>
        Geometries:
        {{ aliasedNodeData?.node_value?.features?.length ?? 0 }} Details:
        {{ aliasedNodeData?.details?.length ?? 0 }}
    </div>
    <div
        class="map-wrap"
        :data-graph-slug="graphSlug"
        :data-node-alias="nodeAlias">
        <div
            ref="mapEl"
            class="map"
            style="min-height: 300px; max-height: 500px"></div>
        <div class="panel">
            <!--button @click="flyVancouver">Vancouver</button>
            <button @click="flyParis">Paris</button-->
            <span class="coords">
                Boundary Centroid Lng/Lat: {{ mapCentre?.[0].toFixed(6) }},
                {{ mapCentre?.[1].toFixed(6) }} | Zoom:
                {{ zoom }}
            </span>
        </div>
    </div>
</template>
