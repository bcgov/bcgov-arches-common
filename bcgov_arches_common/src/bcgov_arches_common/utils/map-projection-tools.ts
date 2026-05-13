// Typed re-export of the projection helpers that live under media/js so
// webpack's entry-point lookup can still pick up the raw JS module while
// callers in `src/` get a clean `@/bcgov_arches_common/utils/...` import.
// @ts-expect-error - the underlying .js module has no type declarations
import mapProjectionToolsJs from '../../../media/js/utils/map-projection-tools.js';
import type { FeatureCollection } from 'geojson';

interface MapProjectionTools {
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
}

const mapProjectionTools: MapProjectionTools = mapProjectionToolsJs;

export default mapProjectionTools;
