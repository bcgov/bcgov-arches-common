import type { FileListValue } from "@/arches_component_lab/datatypes/file-list/types.ts";

// This should probably be in arches-component-lab, or the FileReference there should
// potentially be modified
export type FileReference = FileListValue & {
    file?: File;
    node_id?: string;
    name?: string;
    lastModified?: number;
    size?: number;
    type?: string;
};