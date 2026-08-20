import { describe, it, expect, vi, afterEach } from 'vitest';
import type { FeatureCollection } from 'geojson';

vi.mock('shpjsesm', () => ({ default: vi.fn() }));
vi.mock('togeojson', () => ({ kml: vi.fn() }));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const POINT_FC: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            id: '1',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {},
        },
    ],
};

function makeFile(name: string): File {
    return new File(['content'], name);
}

// ---------------------------------------------------------------------------
// FileReader stubs
//
// The code does:
//   const reader = new window.FileReader();
//   reader.onload = function(e) { ... };
//   reader.readAsText(file)  |  reader.readAsArrayBuffer(file)
//
// We capture the onload assignment via a setter and fire it synchronously
// inside readAsText / readAsArrayBuffer so tests stay synchronous-friendly.
// ---------------------------------------------------------------------------

function stubTextReader(result: string) {
    let onloadFn: ((e: any) => void) | undefined;
    const instance = {
        set onload(fn: (e: any) => void) {
            onloadFn = fn;
        },
        get onload() {
            return onloadFn as any;
        },
        readAsText: vi.fn().mockImplementation(() => {
            onloadFn?.({ target: { result } });
        }),
        readAsArrayBuffer: vi.fn(),
    };
    vi.stubGlobal('FileReader', vi.fn().mockReturnValue(instance));
    return instance;
}

function stubBinaryReader(result: ArrayBuffer) {
    let onloadFn: ((e: any) => void) | undefined;
    const instance = {
        set onload(fn: (e: any) => void) {
            onloadFn = fn;
        },
        get onload() {
            return onloadFn as any;
        },
        readAsText: vi.fn(),
        readAsArrayBuffer: vi.fn().mockImplementation(() => {
            onloadFn?.({ target: { result } });
        }),
    };
    vi.stubGlobal('FileReader', vi.fn().mockReturnValue(instance));
    return instance;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('processFileGeometry', () => {
    afterEach(() => vi.unstubAllGlobals());

    // ------------------------------------------------------------------
    // Unsupported / missing extension
    // ------------------------------------------------------------------

    it('returns undefined for an unsupported file extension', async () => {
        const { processFileGeometry } = await import('./utils');
        expect(await processFileGeometry(makeFile('data.csv'))).toBeUndefined();
    });

    it('returns undefined for a .txt file', async () => {
        const { processFileGeometry } = await import('./utils');
        expect(await processFileGeometry(makeFile('data.txt'))).toBeUndefined();
    });

    it('returns undefined when the file has no extension', async () => {
        const { processFileGeometry } = await import('./utils');
        expect(
            await processFileGeometry(makeFile('noextension')),
        ).toBeUndefined();
    });

    // ------------------------------------------------------------------
    // .json
    // ------------------------------------------------------------------

    describe('.json', () => {
        it('reads the file as text (not binary)', async () => {
            const { processFileGeometry } = await import('./utils');
            const reader = stubTextReader(JSON.stringify(POINT_FC));
            await processFileGeometry(makeFile('data.json'));
            expect(reader.readAsText).toHaveBeenCalledOnce();
            expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(0);
        });

        it('parses and returns the FeatureCollection', async () => {
            const { processFileGeometry } = await import('./utils');
            stubTextReader(JSON.stringify(POINT_FC));
            const result = await processFileGeometry(makeFile('data.json'));
            expect(result).toEqual(POINT_FC);
        });
    });

    // ------------------------------------------------------------------
    // .geojson
    // ------------------------------------------------------------------

    describe('.geojson', () => {
        it('reads the file as text (not binary)', async () => {
            const { processFileGeometry } = await import('./utils');
            const reader = stubTextReader(JSON.stringify(POINT_FC));
            await processFileGeometry(makeFile('map.geojson'));
            expect(reader.readAsText).toHaveBeenCalledOnce();
            expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(0);
        });

        it('parses and returns the FeatureCollection', async () => {
            const { processFileGeometry } = await import('./utils');
            stubTextReader(JSON.stringify(POINT_FC));
            const result = await processFileGeometry(makeFile('map.geojson'));
            expect(result).toEqual(POINT_FC);
        });
    });

    // ------------------------------------------------------------------
    // .kml
    // ------------------------------------------------------------------

    describe('.kml', () => {
        it('reads the file as text (not binary)', async () => {
            const { kml } = await import('togeojson');
            vi.mocked(kml).mockReturnValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            const reader = stubTextReader('<kml/>');
            await processFileGeometry(makeFile('places.kml'));
            expect(reader.readAsText).toHaveBeenCalledOnce();
            expect(reader.readAsArrayBuffer).toHaveBeenCalledTimes(0);
        });

        it('calls togeojson.kml() once with the parsed XML document', async () => {
            const { kml } = await import('togeojson');
            vi.mocked(kml).mockReturnValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            stubTextReader('<kml/>');
            await processFileGeometry(makeFile('places.kml'));
            expect(kml).toHaveBeenCalledOnce();
        });

        it('returns the FeatureCollection produced by togeojson.kml()', async () => {
            const { kml } = await import('togeojson');
            vi.mocked(kml).mockReturnValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            stubTextReader('<kml/>');
            const result = await processFileGeometry(makeFile('places.kml'));
            expect(result).toEqual(POINT_FC);
        });
    });

    // ------------------------------------------------------------------
    // .shp
    // ------------------------------------------------------------------

    describe('.shp', () => {
        it('reads the file as ArrayBuffer (not text)', async () => {
            const { default: shp } = await import('shpjsesm');
            vi.mocked(shp).mockResolvedValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            const reader = stubBinaryReader(new ArrayBuffer(8));
            await processFileGeometry(makeFile('shapes.shp'));
            expect(reader.readAsArrayBuffer).toHaveBeenCalledOnce();
            expect(reader.readAsText).toHaveBeenCalledTimes(0);
        });

        it('calls shpjsesm with the { shp: buffer } wrapper', async () => {
            const { default: shp } = await import('shpjsesm');
            vi.mocked(shp).mockResolvedValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            const buf = new ArrayBuffer(8);
            stubBinaryReader(buf);
            await processFileGeometry(makeFile('shapes.shp'));
            expect(shp).toHaveBeenCalledWith({ shp: buf });
        });

        it('resolves with the FeatureCollection returned by shpjsesm', async () => {
            const { default: shp } = await import('shpjsesm');
            vi.mocked(shp).mockResolvedValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            stubBinaryReader(new ArrayBuffer(8));
            const result = await processFileGeometry(makeFile('shapes.shp'));
            expect(result).toEqual(POINT_FC);
        });
    });

    // ------------------------------------------------------------------
    // .zip
    // ------------------------------------------------------------------

    describe('.zip', () => {
        it('reads the file as ArrayBuffer (not text)', async () => {
            const { default: shp } = await import('shpjsesm');
            vi.mocked(shp).mockResolvedValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            const reader = stubBinaryReader(new ArrayBuffer(8));
            await processFileGeometry(makeFile('shapes.zip'));
            expect(reader.readAsArrayBuffer).toHaveBeenCalledOnce();
            expect(reader.readAsText).toHaveBeenCalledTimes(0);
        });

        it('calls shpjsesm directly with the raw buffer (no wrapper object)', async () => {
            const { default: shp } = await import('shpjsesm');
            vi.mocked(shp).mockResolvedValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            const buf = new ArrayBuffer(8);
            stubBinaryReader(buf);
            await processFileGeometry(makeFile('shapes.zip'));
            expect(shp).toHaveBeenCalledWith(buf);
        });

        it('resolves with the FeatureCollection returned by shpjsesm', async () => {
            const { default: shp } = await import('shpjsesm');
            vi.mocked(shp).mockResolvedValue(POINT_FC as any);
            const { processFileGeometry } = await import('./utils');
            stubBinaryReader(new ArrayBuffer(8));
            const result = await processFileGeometry(makeFile('shapes.zip'));
            expect(result).toEqual(POINT_FC);
        });
    });
});
