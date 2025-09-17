import type { CardXNodeXWidgetData } from '@/arches_component_lab/types.ts';
import { LayerSpecification, StyleSpecification } from 'maplibre-gl';

// Not sure why this needs to be done -- seems like it's been exported as a type
export type LayerSpecificationType = typeof LayerSpecification;
export type StyleSpecificationType = typeof StyleSpecification;

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
};

export type GeoJsonCardXNodeXWidgetData = Omit<CardXNodeXWidgetData, 'node'> & {
    node: GeoJsonNode;
};
