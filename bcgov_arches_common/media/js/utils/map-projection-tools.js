import proj4 from "proj4";

// Common projected coordinate systems used in BC/Western Canada.
//
// Reference:
//     BC FSP Electronic Submission Format, Data Types Overview
//         - (www.for.gov.bc.ca/his/fsp/webhelp/FSP/Online_Tech_Specs/PDFs/FSP_ESF_2-6_Overview__Data_Types.pdf)
//     Proj4 strings sourced from epsg.io.
//
// These are registered with proj4 so we can transform coordinates when a
// user uploads a bare .shp file without an accompanying .prj. When a .prj
// is provided it is passed directly to shpjs which handles reprojection
// automatically.
const PROJECTIONS = {
    WGS84: "EPSG:4326",
    BC_ALBERS: "EPSG:3005",
    NAD83_UTM_7N: "EPSG:26907",
    NAD83_UTM_8N: "EPSG:26908",
    NAD83_UTM_9N: "EPSG:26909",
    NAD83_UTM_10N: "EPSG:26910",
    NAD83_UTM_11N: "EPSG:26911",
    WGS84_UTM_7N: "EPSG:32607",
    WGS84_UTM_8N: "EPSG:32608",
    WGS84_UTM_9N: "EPSG:32609",
    WGS84_UTM_10N: "EPSG:32610",
    WGS84_UTM_11N: "EPSG:32611",
};

proj4.defs(
    PROJECTIONS.BC_ALBERS,
    "+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +datum=NAD83 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.NAD83_UTM_7N,
    "+proj=utm +zone=7 +datum=NAD83 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.NAD83_UTM_8N,
    "+proj=utm +zone=8 +datum=NAD83 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.NAD83_UTM_9N,
    "+proj=utm +zone=9 +datum=NAD83 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.NAD83_UTM_10N,
    "+proj=utm +zone=10 +datum=NAD83 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.NAD83_UTM_11N,
    "+proj=utm +zone=11 +datum=NAD83 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.WGS84_UTM_7N,
    "+proj=utm +zone=7 +datum=WGS84 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.WGS84_UTM_8N,
    "+proj=utm +zone=8 +datum=WGS84 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.WGS84_UTM_9N,
    "+proj=utm +zone=9 +datum=WGS84 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.WGS84_UTM_10N,
    "+proj=utm +zone=10 +datum=WGS84 +units=m +no_defs",
);
proj4.defs(
    PROJECTIONS.WGS84_UTM_11N,
    "+proj=utm +zone=11 +datum=WGS84 +units=m +no_defs",
);

// Check whether any coordinates in a FeatureCollection fall outside valid
// WGS84 lng/lat bounds, which indicates the data is still in a projected
// coordinate system and needs reprojection before Mapbox can display it.
const needsReprojection = function (geoJSON) {
    var checked = 0;
    var outOfBounds = 0;
    var walkCoords = function (coords) {
        if (typeof coords[0] === "number") {
            checked++;
            if (
                coords[0] < -180 ||
                coords[0] > 180 ||
                coords[1] < -90 ||
                coords[1] > 90
            ) {
                outOfBounds++;
            }
            return;
        }
        for (var i = 0; i < coords.length; i++) {
            walkCoords(coords[i]);
        }
    };
    if (geoJSON && geoJSON.features) {
        for (var i = 0; i < geoJSON.features.length; i++) {
            var geom = geoJSON.features[i].geometry;
            if (geom && geom.coordinates) {
                walkCoords(geom.coordinates);
            }
        }
    }
    return checked > 0 && outOfBounds / checked > 0.5;
};

// Transform all coordinates in a FeatureCollection in-place from sourceCRS
// to WGS84. It is used as a fallback when shpjs could not reproject (i.e., no
// .prj was available).
const reprojectGeoJSON = function (geoJSON, sourceCRS) {
    var transformCoords = function (coords) {
        if (typeof coords[0] === "number") {
            var transformed = proj4(sourceCRS, PROJECTIONS.WGS84, [
                coords[0],
                coords[1],
            ]);
            coords[0] = transformed[0];
            coords[1] = transformed[1];
            return;
        }
        for (var i = 0; i < coords.length; i++) {
            transformCoords(coords[i]);
        }
    };
    if (geoJSON && geoJSON.features) {
        for (var i = 0; i < geoJSON.features.length; i++) {
            var geom = geoJSON.features[i].geometry;
            if (geom && geom.coordinates) {
                transformCoords(geom.coordinates);
            }
        }
    }
    return geoJSON;
};

// Attempt to guess the source projection from coordinate ranges when no .prj
// file is available. This is specific to BC/Western Canada — BC Albers
// (EPSG:3005) coordinates have large x values around 1,000,000 and y values
// under ~1,200,000, while UTM coordinates have y values in the 5–7 million
// range. It defaults to EPSG:3005 (BC Albers) as it is the most common
// projection used by the BC government.
const guessProjectionFromCoords = function (geoJSON) {
    var sample = null;
    if (geoJSON && geoJSON.features && geoJSON.features.length > 0) {
        var geom = geoJSON.features[0].geometry;
        if (geom && geom.coordinates) {
            var coords = geom.coordinates;
            while (Array.isArray(coords[0])) {
                coords = coords[0];
            }
            sample = coords;
        }
    }
    if (!sample) return PROJECTIONS.BC_ALBERS;
    var x = sample[0];
    var y = sample[1];
    if (x > 200000 && x < 1900000 && y > 0 && y < 1200000) {
        return PROJECTIONS.BC_ALBERS;
    }
    if (x > 100000 && x < 900000 && y > 5000000 && y < 7000000) {
        if (x < 500000) {
            return PROJECTIONS.NAD83_UTM_10N;
        }
        return PROJECTIONS.NAD83_UTM_9N;
    }
    return PROJECTIONS.BC_ALBERS;
};

export default {
    PROJECTIONS,
    needsReprojection,
    reprojectGeoJSON,
    guessProjectionFromCoords,
};
