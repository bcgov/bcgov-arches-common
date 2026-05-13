// @ts-expect-error - the underlying .js module has no type declarations
import mapProjectionToolsJs from '../../../media/js/utils/map-projection-tools.js';
import proj4 from 'proj4';
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

// UTM zone number for a longitude. Zones are 6 degrees wide, indexed from 1
// at the antimeridian (zone 1 spans -180 to -174).
export function getUtmZone(lng: number): number {
    return Math.floor((lng + 180) / 6) + 1;
}

type Nad83UtmKey = Extract<
    keyof MapProjectionTools['PROJECTIONS'],
    `NAD83_UTM_${number}N`
>;

// EPSG code for the NAD83 UTM zone covering a longitude, or null if the zone
// is outside the BC/Western-Canada range we have proj4 definitions for.
export function getNad83UtmProjection(lng: number): string | null {
    const key = `NAD83_UTM_${getUtmZone(lng)}N` as Nad83UtmKey;
    if (!(key in mapProjectionTools.PROJECTIONS)) return null;
    return mapProjectionTools.PROJECTIONS[key];
}

export function lngLatToNad83Utm(
    lng: number,
    lat: number,
): [number, number] | null {
    const projection = getNad83UtmProjection(lng);
    if (!projection) return null;
    return proj4(mapProjectionTools.PROJECTIONS.WGS84, projection, [
        lng,
        lat,
    ]) as [number, number];
}

export function formatLngLat(coords: [number, number]): [string, string] {
    return [coords[0]?.toFixed(6), coords[1]?.toFixed(6)];
}

export function formatUtmCoords(coords: [number, number]): [string, string] {
    return [coords[0].toFixed(1), coords[1].toFixed(1)];
}

export default mapProjectionTools;
