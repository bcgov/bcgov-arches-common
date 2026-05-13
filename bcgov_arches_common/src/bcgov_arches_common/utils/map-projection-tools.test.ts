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

        // Victoria, BC in NAD83 UTM 10N is approximately
        // (472630 E, 5364161 N) in metres. Zone 10's central meridian is
        // -123 with a 500000 false easting, so Victoria at lng=-123.37
        // (just west of the meridian) sits a bit under 500000 easting,
        // and northing at lat=48.43 is roughly 5.36 million metres.
        expect(easting).toBeCloseTo(472630, 0);
        expect(northing).toBeCloseTo(5364161, 0);
    });
});
