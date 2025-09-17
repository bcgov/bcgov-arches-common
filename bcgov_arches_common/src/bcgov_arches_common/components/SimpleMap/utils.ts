// If you have maplibre-gl types installed:
import type { AnyLayer } from 'maplibre-gl';
import type { Geometry } from 'geojson';
import type { CardXNodeXWidgetData } from '@/arches_component_lab/types.ts';

type NodeConfig = {
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

export type SourceJson = {
    node?: {
        config?: NodeConfig;
    };
};

type FeatureInput = {
    id: string;
    geometry: Geometry; // Point | LineString | Polygon | Multi*
};

type ParsedColor = { color: string; opacity: number };

function parseColor(input?: string): ParsedColor {
    if (!input) return { color: '#000000', opacity: 1 };
    const s = String(input).trim();
    const rgba = s.match(
        /^rgba?\((\s*\d+\s*),(\s*\d+\s*),(\s*\d+\s*)(?:,(\s*(?:0?\.\d+|1(?:\.0+)?|0)\s*))?\)$/i,
    );
    if (rgba) {
        const r = Math.max(0, Math.min(255, parseInt(rgba[1], 10)));
        const g = Math.max(0, Math.min(255, parseInt(rgba[2], 10)));
        const b = Math.max(0, Math.min(255, parseInt(rgba[3], 10)));
        const a =
            rgba[4] != null ? Math.max(0, Math.min(1, parseFloat(rgba[4]))) : 1;
        return { color: `rgb(${r}, ${g}, ${b})`, opacity: a };
    }
    // hex or named color
    return { color: s, opacity: 1 };
}

/**
 * Build MapLibre layer definitions from node.config in your JSON.
 * Returns layers ordered for proper z-index (halos first).
 */
export function buildLayersForFeature(
    feature: FeatureInput,
    sourceJson: CardXNodeXWidgetData,
): AnyLayer[] {
    const cfg: NodeConfig = sourceJson?.node?.config ?? {};

    const {
        weight = 2,
        outlineWeight = 2,
        radius = 2,
        haloWeight = 4,
        haloRadius = 4,
        lineColor = 'rgba(255,122,0,0.73)',
        lineHaloColor = 'rgba(255,122,0,0.3)',
        pointColor = 'rgba(255,122,0,0.73)',
        pointHaloColor = 'rgba(255,122,0,0.3)',
        fillColor = 'rgba(255,122,0,0.73)',
        outlineColor = 'rgba(255,122,0,0.3)',
    } = cfg;

    const { color: lineColorRGB, opacity: lineOpacity } = parseColor(lineColor);
    const { color: lineHaloColorRGB, opacity: lineHaloOpacity } =
        parseColor(lineHaloColor);
    const { color: pointColorRGB, opacity: pointOpacity } =
        parseColor(pointColor);
    const { color: pointHaloColorRGB, opacity: pointHaloOpacity } =
        parseColor(pointHaloColor);
    const { color: fillColorRGB, opacity: fillOpacity } = parseColor(fillColor);
    const { color: outlineColorRGB, opacity: outlineOpacity } =
        parseColor(outlineColor);

    const src = feature.id;
    const baseId = `${feature.id}-site`;
    const geomType = feature.geometry?.type ?? 'Geometry';

    const isPointLike = /^(Point|MultiPoint)$/i.test(geomType);
    const isLineLike = /^(LineString|MultiLineString)$/i.test(geomType);
    const isPolygonLike = /^(Polygon|MultiPolygon)$/i.test(geomType);

    const layers: AnyLayer[] = [];

    if (isPointLike) {
        layers.push({
            id: `${baseId}-point`,
            type: 'circle',
            source: src,
            paint: {
                'circle-radius': Math.max(0, radius) + Math.max(0, haloRadius),
                'circle-color': pointColorRGB,
                'circle-opacity': pointOpacity,
                'circle-stroke-color': pointHaloColorRGB,
                'circle-stroke-opacity': pointHaloOpacity,
                'circle-stroke-width': Math.max(0, haloWeight),
            },
            // MapLibre type defs for expressions are broad; cast for convenience:
            filter: [
                'in',
                ['geometry-type'],
                ['literal', ['Point', 'MultiPoint']],
            ] as any,
        });
    }

    if (isLineLike) {
        layers.push({
            id: `${baseId}-line-halo`,
            type: 'line',
            source: src,
            paint: {
                'line-color': lineHaloColorRGB,
                'line-opacity': lineHaloOpacity,
                'line-width': Math.max(0, weight) + Math.max(0, haloWeight),
                'line-blur': 0.5,
            },
            filter: [
                'in',
                ['geometry-type'],
                ['literal', ['LineString', 'MultiLineString']],
            ] as any,
        });

        layers.push({
            id: `${baseId}-line`,
            type: 'line',
            source: src,
            paint: {
                'line-color': lineColorRGB,
                'line-opacity': lineOpacity,
                'line-width': Math.max(0, weight),
            },
            filter: [
                'in',
                ['geometry-type'],
                ['literal', ['LineString', 'MultiLineString']],
            ] as any,
        });
    }

    if (isPolygonLike) {
        layers.push({
            id: `${baseId}-fill`,
            type: 'fill',
            source: src,
            paint: {
                'fill-color': fillColorRGB,
                'fill-opacity': fillOpacity,
            },
            filter: [
                'in',
                ['geometry-type'],
                ['literal', ['Polygon', 'MultiPolygon']],
            ] as any,
        });

        layers.push({
            id: `${baseId}-outline`,
            type: 'line',
            source: src,
            paint: {
                'line-color': outlineColorRGB,
                'line-opacity': outlineOpacity,
                'line-width': Math.max(0, outlineWeight),
            },
            filter: [
                'in',
                ['geometry-type'],
                ['literal', ['Polygon', 'MultiPolygon']],
            ] as any,
        });
    }

    if (!isPointLike && !isLineLike && !isPolygonLike) {
        layers.push({
            id: `${baseId}-fallback`,
            type: 'line',
            source: src,
            paint: {
                'line-color': lineColorRGB,
                'line-opacity': lineOpacity,
                'line-width': Math.max(0, weight),
            },
        } as AnyLayer);
    }

    return layers;
}
