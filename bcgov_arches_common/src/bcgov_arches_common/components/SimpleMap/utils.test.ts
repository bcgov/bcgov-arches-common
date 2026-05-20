import { describe, it, expect } from 'vitest';
import { buildLayersForFeature } from './utils.ts';
import type { GeoJsonCardXNodeXWidgetData } from './types.ts';

const sourceJson = (
    config: Record<string, unknown> = {},
): GeoJsonCardXNodeXWidgetData =>
    ({
        node: { alias: 'test', isrequired: false, nodeid: 'n1', config },
    }) as GeoJsonCardXNodeXWidgetData;

describe('buildLayersForFeature advancedStyle', () => {
    it('uses advancedStyle JSON when advancedStyling is enabled', () => {
        const advancedStyle = JSON.stringify([
            {
                id: 'borden-fill',
                type: 'fill',
                paint: { 'fill-color': '#ff0000' },
            },
        ]);
        const layers = buildLayersForFeature(
            'src-1',
            sourceJson({ advancedStyling: true, advancedStyle }),
        );
        expect(layers).toHaveLength(1);
        expect(layers[0].id).toBe('src-1-borden-fill');
        expect((layers[0] as { source: string }).source).toBe('src-1');
    });

    it('falls back to default layers when advancedStyle JSON is invalid', () => {
        const layers = buildLayersForFeature(
            'src-2',
            sourceJson({
                advancedStyling: true,
                advancedStyle: '{not valid json',
            }),
        );
        expect(layers.length).toBeGreaterThan(1);
        expect(layers.map((l) => l.id)).toContain('src-2-point');
    });
});
