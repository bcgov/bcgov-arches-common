import type { FeatureCollection } from 'geojson';

declare const mapProjectionTools: {
    PROJECTIONS: {
        WGS84: 'EPSG:4326';
        BC_ALBERS: 'EPSG:3005';
        NAD83_UTM_7N: 'EPSG:26907';
        NAD83_UTM_8N: 'EPSG:26908';
        NAD83_UTM_9N: 'EPSG:26909';
        NAD83_UTM_10N: 'EPSG:26910';
        NAD83_UTM_11N: 'EPSG:26911';
        WGS84_UTM_7N: 'EPSG:32607';
        WGS84_UTM_8N: 'EPSG:32608';
        WGS84_UTM_9N: 'EPSG:32609';
        WGS84_UTM_10N: 'EPSG:32610';
        WGS84_UTM_11N: 'EPSG:32611';
    };
    needsReprojection(geoJSON: FeatureCollection | null | undefined): boolean;
    reprojectGeoJSON<T extends FeatureCollection>(
        geoJSON: T,
        sourceCRS: string,
    ): T;
    guessProjectionFromCoords(
        geoJSON: FeatureCollection | null | undefined,
    ): string;
};

export default mapProjectionTools;
