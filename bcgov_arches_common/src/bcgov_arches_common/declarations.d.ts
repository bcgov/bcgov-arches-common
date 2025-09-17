// declare untyped modules that have been added to your project in `package.json`
// Module homepage on npmjs.com uses logos "TS" or "DT" to indicate if typed

import('@/arches/declarations.d.ts');

declare module 'bcgov_arches_common';
declare module 'underscore';
declare module 'maplibre-gl';
declare module '@turf/helpers';
declare module '@turf/bbox';
declare module '@turf/centroid';
declare module '@maplibre/maplibre-gl-style-spec';
// declare filetypes used in `./src/` folder
declare module '*.ts';
declare module '*.vue';
