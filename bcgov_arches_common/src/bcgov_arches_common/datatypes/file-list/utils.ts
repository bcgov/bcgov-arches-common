import type { AliasedTileDataWithAudit } from '@/bcgov_arches_common/types.ts';
import type { FileListAliasedNodeData } from '@/arches_vue_components/datatypes/file-list/types.ts';
import arches from 'arches';

export const formatFilenameUrl = (
    row: AliasedTileDataWithAudit,
    fieldName: string,
): string => {
    const file = (row?.aliased_data?.[fieldName] as FileListAliasedNodeData)
        ?.node_value?.[0];
    return file
        ? `<a href="${getFileUrl(file.url)}" target="${file.file_id}">${file.name}</a>`
        : '';
};

// This ensures that file URLs include any URL prefix when behind a reverse proxy
// This is duplicated from the arches-vue-components widget logic
// @todo - The arches-vue-components should expose the implementation
export const getFileUrl = (originalUrl: string) => {
    const httpRegex = /^(blob:|https?:\/\/)/;
    if (
        !originalUrl ||
        httpRegex.test(originalUrl) ||
        originalUrl.startsWith(arches.urls.url_subpath)
    ) {
        return originalUrl;
    }
    return (arches.urls.url_subpath + originalUrl).replace('//', '/');
};
