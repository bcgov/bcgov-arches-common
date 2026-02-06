// types/shpjsesm.d.ts

declare module 'shpjsesm' {
    import { FeatureCollection } from 'geojson';

    type ShpBuffer = ArrayBuffer | ArrayBufferLike | string;

    // Object form: { shp, dbf?, prj?, cpg? }
    interface ShpPartsInput {
        shp: ShpBuffer;
        dbf?: ShpBuffer;
        prj?: ShpBuffer;
        cpg?: ShpBuffer;
    }

    type ShpInput = ShpBuffer | ShpPartsInput;

    /**
     * shpjs default export (ESM build wired via nodeModulesPaths):
     *  - shp(buffer) → Promise<FeatureCollection>
     *  - shp({ shp, dbf?, prj?, cpg? }) → Promise<FeatureCollection>
     */
    function shp(input: ShpInput): Promise<FeatureCollection>;

    export default shp;
}
