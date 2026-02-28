import type { FeatureCollection } from 'geojson';

export interface MapFileData {
    name: string;
    size: number;
    type: string;
    url: string;
    file: File;
    node_id: string;
    geometrySourceId: string;
    geometries: FeatureCollection;
}

export type PrimeVueMapFile = File & { objectURL: string };
