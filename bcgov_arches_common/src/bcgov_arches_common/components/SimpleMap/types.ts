import type { CardXNodeXWidgetData } from '@/arches_component_lab/types.ts';
import type {
    LayerSpecification,
    SourceSpecification,
    StyleSpecification,
} from 'maplibre-gl';

// utils.ts
// Not sure why this needs to be done -- seems like it's been exported as a type
export type StyleSpecificationType = StyleSpecification;
export type LayerSpecificationType = LayerSpecification;

export type MapLibreMapSourcesType = { [_: string]: SourceSpecification };

// `arches.mapMarkers` name/url pair seeded from the MapMarker DB table.
export type ArchesMapMarker = {
    name: string;
    url: string;
};

type GeoJsonNode = {
    alias: string;
    isrequired: boolean;
    nodeid: string;
    config: GeoJsonNodeConfigType;
};

export type GeoJsonNodeConfigType = {
    weight?: number; // line width
    outlineWeight?: number; // polygon outline width
    radius?: number; // point radius
    haloWeight?: number; // line/point halo width
    haloRadius?: number; // extra radius for point halo
    lineColor?: string;
    lineHaloColor?: string;
    pointColor?: string;
    pointHaloColor?: string;
    fillColor?: string;
    outlineColor?: string;
    advancedStyling?: boolean;
    // JSON-encoded array of MapLibre layer specifications
    advancedStyle?: string;
};

export type GeoJsonCardXNodeXWidgetData = Omit<CardXNodeXWidgetData, 'node'> & {
    node: GeoJsonNode;
};
