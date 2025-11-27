import type { AliasedTileData } from '@/arches_component_lab/types.ts';
import type {
    FileListValue,
    FileReference,
} from '@/arches_component_lab/datatypes/file-list/types.ts';

export function formatFileLink(file: FileReference): string {
    if (!file?.url) return '';
    return `<a href="${file.url}" target="_blank" rel="noopener noreferrer">${file.url}</a>`;
}

export function expandDocumentRows<T extends AliasedTileData>(
    documents: T[],
    fieldName: string,
): T[] {
    const expandedRows: T[] = [];

    documents.forEach((doc, docIndex) => {
        const aliasedData = doc.aliased_data as Record<string, unknown>;
        const fieldData = aliasedData?.[fieldName] as FileListValue | undefined;
        const files = fieldData?.node_value;

        if (!files || !Array.isArray(files) || files.length <= 1) {
            expandedRows.push(doc);
            return;
        }

        files.forEach((file, fileIndex) => {
            expandedRows.push({
                ...doc,
                rowKey: `${doc.tileid || docIndex}-${fileIndex}`,
                aliased_data: {
                    ...aliasedData,
                    [fieldName]: {
                        ...fieldData,
                        node_value: [file],
                        display_value: file.url,
                    },
                },
            } as T);
        });
    });

    return expandedRows;
}

export function applyFileLinks<T extends AliasedTileData>(
    documents: T[],
    fieldName: string,
): T[] {
    return documents.map((doc) => {
        const aliasedData = doc.aliased_data as Record<string, unknown>;
        const fieldData = aliasedData?.[fieldName] as FileListValue | undefined;
        const files = fieldData?.node_value;

        if (!files || !Array.isArray(files) || files.length === 0) {
            return doc;
        }

        const file = files[0];

        return {
            ...doc,
            aliased_data: {
                ...aliasedData,
                [fieldName]: {
                    ...fieldData,
                    display_value: formatFileLink(file),
                },
            },
        } as T;
    });
}
