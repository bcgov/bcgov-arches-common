import { describe, it, expect } from 'vitest';
import type { MapFileData, PrimeVueMapFile } from './types';

// ---------------------------------------------------------------------------
// MapFileData
// ---------------------------------------------------------------------------

describe('MapFileData', () => {
    it('can be constructed as a plain object satisfying the interface', () => {
        const data: MapFileData = {
            name: 'places.geojson',
            size: 2048,
            type: 'application/json',
            url: 'blob:http://localhost/abc',
            file: new File(['{}'], 'places.geojson'),
            node_id: 'node-abc',
            geometrySourceId: 'src-xyz',
            geometries: { type: 'FeatureCollection', features: [] },
        };

        expect(data.name).toBe('places.geojson');
        expect(data.size).toBe(2048);
        expect(data.geometries.type).toBe('FeatureCollection');
        expect(data.geometries.features).toHaveLength(0);
    });

    it('allows a non-empty features array in geometries', () => {
        const data: MapFileData = {
            name: 'boundary.shp',
            size: 512,
            type: 'application/octet-stream',
            url: 'blob:http://localhost/def',
            file: new File([''], 'boundary.shp'),
            node_id: 'node-1',
            geometrySourceId: 'src-1',
            geometries: {
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [0, 0] },
                        properties: {},
                    },
                ],
            },
        };

        expect(data.geometries.features).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// PrimeVueMapFile
// ---------------------------------------------------------------------------

describe('PrimeVueMapFile', () => {
    it('extends File with an objectURL property', () => {
        const file = new File([''], 'archive.zip') as PrimeVueMapFile;
        file.objectURL = 'blob:http://localhost/ghi';

        expect(file.name).toBe('archive.zip');
        expect(file.objectURL).toBe('blob:http://localhost/ghi');
    });

    it('retains File prototype methods', () => {
        const file = new File(['hello'], 'data.kml', {
            type: 'application/vnd.google-earth.kml+xml',
        }) as PrimeVueMapFile;
        file.objectURL = 'blob:http://localhost/jkl';

        expect(file instanceof File).toBe(true);
        expect(file.type).toBe('application/vnd.google-earth.kml+xml');
    });
});
