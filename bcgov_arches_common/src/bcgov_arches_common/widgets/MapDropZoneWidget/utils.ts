import shp from 'shpjsesm';
import { kml } from 'togeojson';
import type { FeatureCollection } from 'geojson';

export async function processFileGeometry(
    file: File,
): Promise<FeatureCollection | undefined> {
    const errors = [];
    const extension = file.name.split('.').pop();
    if (
        !extension ||
        !['kml', 'json', 'geojson', 'shp', 'zip'].includes(extension)
    ) {
        errors.push({
            message: 'File unsupported: "' + file.name + '"',
        });
    } else {
        return new Promise(function (resolve) {
            const reader = new window.FileReader();
            reader.onload = function (e) {
                if (!e.target?.result) {
                    errors.push({
                        message: 'Unable to read file: "' + file.name + '"',
                    });
                    return;
                }
                let geoJSON;
                if (['json', 'geojson'].includes(extension))
                    geoJSON = JSON.parse(e.target.result as string);
                else if (extension === 'kml')
                    geoJSON = kml(
                        new window.DOMParser().parseFromString(
                            e.target.result as string,
                            'text/xml',
                        ),
                    );
                else if (extension === 'shp')
                    shp({ shp: e.target.result }).then(
                        (parsedShp: FeatureCollection) => {
                            resolve(parsedShp);
                        },
                    );
                else if (extension === 'zip')
                    shp(e.target.result).then(function (
                        parsedZip: FeatureCollection,
                    ) {
                        resolve(parsedZip);
                    });
                if (!['shp', 'zip'].includes(extension)) resolve(geoJSON);
            };
            if (['shp', 'zip'].includes(extension))
                reader.readAsArrayBuffer(file);
            else reader.readAsText(file);
        });
    }
}
