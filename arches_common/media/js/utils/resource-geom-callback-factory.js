define([ ], function($, _, arches, ko, BaseFilter, MapComponentViewModel, binFeatureCollection, mapStyles, turf, geohash, geojsonExtent, uuid, geojsonhint, popupDataProvider, mapFilterUtils) {
    let resourceGeomCallbackFactory = {
        // Return a function that can extract the geometry from the resource model
        getCallbackForFeature: function(feature) {
            return function(resource) { return {}; }
        }
    };
    return resourceGeomCallbackFactory;
});