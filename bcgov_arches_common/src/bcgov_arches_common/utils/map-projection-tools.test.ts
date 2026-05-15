import { describe, it, expect } from 'vitest';
import {
    getUtmZone,
    getNad83UtmProjection,
    lngLatToNad83Utm,
    formatLngLat,
    formatUtmCoords,
} from './map-projection-tools';

describe('getUtmZone', () => {
    it('returns the correct UTM zone across BC and reference longitudes', () => {
        expect(getUtmZone(-123.37)).toBe(10); // Victoria, BC
        expect(getUtmZone(-115.77)).toBe(11); // Cranbrook, BC (eastern BC)
        expect(getUtmZone(-138)).toBe(8); // western edge of BC
        expect(getUtmZone(-180)).toBe(1); // antimeridian
        expect(getUtmZone(0)).toBe(31); // prime meridian
    });
});

describe('getNad83UtmProjection', () => {
    it('returns the EPSG code for zones we have defined (7-11)', () => {
        expect(getNad83UtmProjection(-138)).toBe('EPSG:26908'); // zone 8
        expect(getNad83UtmProjection(-130)).toBe('EPSG:26909'); // zone 9
        expect(getNad83UtmProjection(-123)).toBe('EPSG:26910'); // zone 10
        expect(getNad83UtmProjection(-117)).toBe('EPSG:26911'); // zone 11
    });

    it('returns null for zones outside the BC/Western-Canada range', () => {
        // Zone 31 (prime meridian) — no NAD83 def registered for it.
        expect(getNad83UtmProjection(0)).toBeNull();
        // Zone 1 — no NAD83 def registered for it.
        expect(getNad83UtmProjection(-180)).toBeNull();
    });
});

describe('lngLatToNad83Utm', () => {
    it('converts Victoria, BC into NAD83 UTM zone 10N metres', () => {
        const result = lngLatToNad83Utm(-123.37, 48.43);
        expect(Array.isArray(result)).toBe(true);
        const [easting, northing] = result as [number, number];
        expect(easting).toBeCloseTo(472630, 0);
        expect(northing).toBeCloseTo(5364161, 0);
    });

    it('returns null when the longitude falls outside the supported UTM zones', () => {
        expect(lngLatToNad83Utm(0, 51.5)).toBeNull();
    });
});

describe('formatting tests', () => {
    it('formatLngLat formats both components to 6 decimal places', () => {
        expect(formatLngLat([-123.123456789, 48.987654321])).toEqual([
            '-123.123457',
            '48.987654',
        ]);
    });

    it('formatLngLat pads trailing zeros so output always has 6 decimals', () => {
        expect(formatLngLat([-123, 48])).toEqual(['-123.000000', '48.000000']);
    });

    it('formatUtmCoords rounds easting and northing to whole numbers', () => {
        expect(formatUtmCoords([472630.456, 5364161.734])).toEqual([
            '472630',
            '5364162',
        ]);
    });

    it('formatUtmCoords keeps whole-number inputs without decimals', () => {
        expect(formatUtmCoords([472630, 5364161])).toEqual([
            '472630',
            '5364161',
        ]);
    });
});
