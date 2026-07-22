import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FeatureCollection } from 'geojson';

// vi.hoisted() runs before any imports, so these vi.fn() instances can be
// referenced inside vi.mock() factory functions without triggering actual
// module resolution for packages that aren't installed in the test environment.
const { mockShp, mockKml } = vi.hoisted(() => ({
    mockShp: vi.fn(),
    mockKml: vi.fn(),
}));

vi.mock('shpjsesm', () => ({ default: mockShp }));
vi.mock('togeojson', () => ({ kml: mockKml }));

import { processFileGeometry } from './utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const geojsonFixture: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        },
    ],
};

/** Result that MockFileReader will return from the next read call. */
let mockReadResult: string | ArrayBuffer | null = null;

/**
 * Minimal FileReader stub that fires onload synchronously so we can
 * resolve the processFileGeometry Promise without real async I/O.
 */
class MockFileReader {
    onload: ((e: any) => void) | null = null;

    readAsText(_file: File): void {
        this.onload?.({ target: { result: mockReadResult } });
    }

    readAsArrayBuffer(_file: File): void {
        this.onload?.({ target: { result: mockReadResult } });
    }
}

const makeFile = (name: string): File =>
    new File([''], name, { type: 'application/octet-stream' });

// ---------------------------------------------------------------------------
// processFileGeometry
// ---------------------------------------------------------------------------

describe('processFileGeometry', () => {
    beforeEach(() => {
        vi.stubGlobal('FileReader', MockFileReader);
        mockReadResult = null;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    // -------------------------------------------------------------------------
    // Unsupported / missing extensions
    // -------------------------------------------------------------------------

    describe('unsupported file types', () => {
        it('returns undefined for a .txt file', async () => {
            const result = await processFileGeometry(makeFile('data.txt'));
            expect(result).toBeUndefined();
        });

        it('returns undefined for a .csv file', async () => {
            const result = await processFileGeometry(makeFile('data.csv'));
            expect(result).toBeUndefined();
        });

        it('returns undefined when the file has no extension', async () => {
            const result = await processFileGeometry(makeFile('noextension'));
            expect(result).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // .json / .geojson — text path
    // -------------------------------------------------------------------------

    describe('.json files', () => {
        it('parses and returns the FeatureCollection', async () => {
            mockReadResult = JSON.stringify(geojsonFixture);
            const result = await processFileGeometry(makeFile('data.json'));
            expect(result).toEqual(geojsonFixture);
        });
    });

    describe('.geojson files', () => {
        it('parses and returns the FeatureCollection', async () => {
            mockReadResult = JSON.stringify(geojsonFixture);
            const result = await processFileGeometry(
                makeFile('places.geojson'),
            );
            expect(result).toEqual(geojsonFixture);
        });
    });

    // -------------------------------------------------------------------------
    // .kml — text path via DOMParser + togeojson
    // -------------------------------------------------------------------------

    describe('.kml files', () => {
        it('parses via DOMParser and kml(), resolves with the result', async () => {
            const kmlString =
                '<kml xmlns="http://www.opengis.net/kml/2.2"></kml>';
            mockReadResult = kmlString;

            const mockDoc = {};
            const mockParser = { parseFromString: vi.fn(() => mockDoc) };
            vi.stubGlobal(
                'DOMParser',
                vi.fn(() => mockParser),
            );
            mockKml.mockReturnValue(geojsonFixture as any);

            const result = await processFileGeometry(makeFile('features.kml'));

            expect(mockParser.parseFromString).toHaveBeenCalledWith(
                kmlString,
                'text/xml',
            );
            expect(mockKml).toHaveBeenCalledWith(mockDoc);
            expect(result).toEqual(geojsonFixture);
        });
    });

    // -------------------------------------------------------------------------
    // .shp — ArrayBuffer path via shpjsesm
    // -------------------------------------------------------------------------

    describe('.shp files', () => {
        it('reads as ArrayBuffer and passes {shp: buffer} to shp()', async () => {
            const buffer = new ArrayBuffer(8);
            mockReadResult = buffer;
            mockShp.mockResolvedValue(geojsonFixture as any);

            const result = await processFileGeometry(makeFile('data.shp'));

            expect(mockShp).toHaveBeenCalledWith({ shp: buffer });
            expect(result).toEqual(geojsonFixture);
        });
    });

    // -------------------------------------------------------------------------
    // .zip — ArrayBuffer path via shpjsesm
    // -------------------------------------------------------------------------

    describe('.zip files', () => {
        it('reads as ArrayBuffer and passes the buffer directly to shp()', async () => {
            const buffer = new ArrayBuffer(16);
            mockReadResult = buffer;
            mockShp.mockResolvedValue(geojsonFixture as any);

            const result = await processFileGeometry(makeFile('archive.zip'));

            expect(mockShp).toHaveBeenCalledWith(buffer);
            expect(result).toEqual(geojsonFixture);
        });
    });

    // -------------------------------------------------------------------------
    // Null / missing reader result — promise should not resolve
    // -------------------------------------------------------------------------

    describe('empty reader result', () => {
        it('does not resolve when e.target.result is null', async () => {
            mockReadResult = null; // MockFileReader will pass null to onload
            const raceResult = await Promise.race([
                processFileGeometry(makeFile('data.json')),
                // sentinel that wins if processFileGeometry never resolves
                new Promise<'timeout'>((resolve) =>
                    setTimeout(() => resolve('timeout'), 50),
                ),
            ]);
            expect(raceResult).toBe('timeout');
        });
    });
});
