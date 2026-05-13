import { describe, it, expect } from 'vitest';
import proj4 from 'proj4';
import mapProjectionTools from './map-projection-tools';

describe('mapProjectionTools (as used by SimpleMapView)', () => {
    it('lets proj4 convert a WGS84 BC point into NAD83 UTM 10N metres', () => {
        // Victoria, BC in longitude/latitude.
        const lng = -123.37;
        const lat = 48.43;

        // Picks a UTM zone from the longitude using
        // utmZone = floor((lng + 180) / 6) + 1. For lng = -123.37 that
        // gives zone 10, so it would look up NAD83_UTM_10N.
        const code = mapProjectionTools.PROJECTIONS.NAD83_UTM_10N;
        expect(code).toBe('EPSG:26910');
        const [easting, northing] = proj4(
            mapProjectionTools.PROJECTIONS.WGS84,
            code,
            [lng, lat],
        );

        // UTM eastings are roughly 0 to 1,000,000 metres and northings in
        // BC latitudes are in the millions of metres. Just sanity-check
        // the result is in that ballpark, not the original degree values.
        expect(easting).toBeGreaterThan(100_000);
        expect(easting).toBeLessThan(900_000);
        expect(northing).toBeGreaterThan(5_000_000);
        expect(northing).toBeLessThan(6_000_000);
    });
});
