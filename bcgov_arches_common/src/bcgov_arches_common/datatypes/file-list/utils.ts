import type { AliasedTileDataWithAudit } from '@/bcgov_arches_common/types.ts';
import type { FileListValue } from '@/arches_component_lab/datatypes/file-list/types.ts';

export const formatFilenameUrl = (
    row: AliasedTileDataWithAudit,
    fieldName: string,
): string => {
    const imageData = row?.aliased_data?.[fieldName] as FileListValue;
    return (imageData?.node_value?.length ?? 0 > 0)
        ? `<a href="${imageData?.node_value[0].url}" target="${imageData.node_value[0].file_id}">${imageData.node_value[0].name}</a>`
        : '';
};
