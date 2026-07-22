<script setup lang="ts">
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
import _ from 'underscore';
import type { GeoJSONFeatureCollectionCardXNodeXWidgetData } from '@/bcgov_arches_common/datatypes/geojson-feature-collection/types.ts';
import type { Feature, FeatureCollection, Position } from 'geojson';
import type { GeoJsonCardXNodeXWidgetData } from '@/bcgov_arches_common/widgets/SimpleMap/types.ts';
import {
    buildLayersForFeature,
    removeLayersUsingSource,
    getCentroidMarker,
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
        GeoJSONFeatureCollectionCardXNodeXWidgetData | undefined;
    mapData: MapData | undefined | null;
    aliasedNodeData: GeoJSONFeatureCollectionValue | undefined;
    markCentroid?: boolean;
}>();
const {
    graphSlug,
    nodeAlias,
    cardXNodeXWidgetData,
    mapData,
    aliasedNodeData,
    markCentroid,
} = toRefs(props);

const geometry = computed<Feature | undefined>(() => {
    return aliasedNodeData?.value?.node_value?.features?.[0];
});

const allGeometries = computed<FeatureCollection | undefined>(() => {
    const geometriesFromFiles = aliasedNodeData?.value?.details.reduce(
        (coll, file) => [...coll, ...file.geometries.features],
        [],
    );
    const geometriesFromNode =
        aliasedNodeData?.value?.node_value?.features ?? [];
    return {
        type: 'FeatureCollection',
        features: [...geometriesFromFiles, ...geometriesFromNode],
    };
});

// const hasGeometry = computed<boolean>(() => {
//     return geometry.value !== undefined;
// });

const mapLoaded = ref(false);
const centroidMarker = shallowRef<maplibregl.Marker | null>(null);

const addedDetails = new Map<string, MapFileData>();
const addedFeatureIds = new Set<string>();

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
            ? (centroid(geometry.value as AllGeoJSON)?.geometry?.coordinates ??
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

    const basemap = _.find(mapData.value.basemaps, (basemap: MapLayer) => {
        return basemap.addtomap;
    });
    defaultStyle.value.sources[basemap.source.name] = basemap.source.source;
    defaultStyle.value.layers.push(...basemap.layerdefinitions);

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

    map.value.on('moveend', () => {
        if (!map.value) return;
        // const c = map.value.getCenter();
        // center.value = [Number(c.lng.toFixed(5)), Number(c.lat.toFixed(5))];
        zoom.value = Number(map.value.getZoom().toFixed(2));
    });

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
    (mapData) => {
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
    });

    if (
        featuresToAdd.length === 0 &&
        featuresToRemove.length === 0 &&
        (aliasedNodeData.value?.node_value?.features?.length ?? 0 > 0)
    ) {
        aliasedNodeData.value?.node_value?.features.forEach((feature) => {
            {
                const featureid = feature.id;
                if (featureid && !mapInstance.getSource(`${featureid}`)) {
                    mapInstance.addSource(`${featureid}`, {
                        type: 'geojson',
                        data: feature,
                    });
                    const layers = buildLayersForFeature(
                        `${featureid}`,
                        feature,
                        cardXNodeXWidgetData as any as GeoJsonCardXNodeXWidgetData,
                    );
                    layers.forEach((layer) => {
                        map.value?.addLayer(layer);
                    });
                }
            }
        });
    }

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

    if (markCentroid.value) {
        if (!centroidMarker.value) {
            centroidMarker.value = getCentroidMarker(
                mapCentre.value,
                'Feature centroid',
            );
            centroidMarker.value.addTo(map.value);
        } else {
            centroidMarker.value.setLngLat(mapCentre.value);
        }
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
    () => aliasedNodeData?.value,
    (newVal) => {
        if (!props.cardXNodeXWidgetData || !mapData.value || !newVal) return;

        const newDetails = newVal.details ?? [];
        const newDetailIds = new Set(
            newDetails.map((d) => d.geometrySourceId as string),
        );

        const toAdd = newDetails.filter(
            (d) => !addedDetails.has(d.geometrySourceId as string),
        );
        const toRemove = [...addedDetails.values()].filter(
            (d) => !newDetailIds.has(d.geometrySourceId as string),
        );

        toAdd.forEach((d) => {
            addedDetails.set(d.geometrySourceId as string, d);
            d.geometries.features.forEach((f: Feature) =>
                addedFeatureIds.add(String(f.id)),
            );
        });
        toRemove.forEach((d) => {
            addedDetails.delete(d.geometrySourceId as string);
            d.geometries.features.forEach((f) =>
                addedFeatureIds.delete(String(f.id)),
            );
        });

        if (toAdd.length || toRemove.length) {
            updateMapGeometries(toAdd, toRemove);
        } else {
            const unaddedNodeFeatures = (
                newVal.node_value?.features ?? []
            ).filter((f) => f.id && !addedFeatureIds.has(String(f.id)));
            if (unaddedNodeFeatures.length) {
                updateMapGeometries([], []);
            }
        }
    },
);
</script>
<template>
    <div
        class="map-wrap"
        :data-graph-slug="graphSlug"
        :data-node-alias="nodeAlias">
        <div
            ref="mapEl"
            class="map"
            style="
                min-height: var(--map-height, 550px);
                height: var(--map-height, 550px);
                max-height: var(--map-max-height, 550px);
                max-width: var(--map-max-width, 700px);
            "></div>
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
<style>
.map-wrap > .panel {
    background-color: transparent;
}
</style>
