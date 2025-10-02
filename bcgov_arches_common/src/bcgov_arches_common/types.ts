import type { Ref } from 'vue';
import type { TreeNode } from 'primevue/treenode';
import type { AliasedNodeData, AliasedNodegroupData, AliasedTileData } from "@/arches_component_lab/types.ts";
// import type { Label } from "@/arches_vue_utils/types";

// From arches_vue_utils in v8.0.x
export interface Language {
    code: string;
    default_direction: 'ltr' | 'rtl';
    id: number;
    isdefault: boolean;
    name: string;
    scope: string;
}

export interface Label {
    value: string;
    language_id: string;
    valuetype_id: string;
}

export interface WithLabels {
    labels: Label[];
}

export interface WithValues {
    values: Label[];
}

export type Labellable = WithLabels | WithValues;
// End copy from arches_vue_utils in v8.0.x

export interface User {
    first_name: string;
    last_name: string;
    username: string;
}

// Prop injection types
export interface UserRefAndSetter {
    user: Ref<User | null>;
    setUser: (userToSet: User | null) => void;
}
export interface DisplayedRowRefAndSetter {
    displayedRow: Ref<Concept | null>;
    setDisplayedRow: (val: Concept | Scheme | null) => void;
}

export interface Concept {
    id: string;
    labels: Label[];
    narrower: Concept[];
}

export interface Scheme {
    id: string;
    labels: Label[];
    top_concepts: Concept[];
}

export interface NodeAndParentInstruction {
    node: TreeNode;
    shouldHideSiblings: boolean;
}

export interface IconLabels {
    concept: string;
    scheme: string;
}

export interface SearchResultItem {
    id: string;
    labels: Label[];
    parents: {
        id: string;
        labels: Label[];
    }[];
    polyhierarchical: boolean;
}

export interface ConceptOption {
    id: string;
    text: string;
}

export interface ResourceOption {
    resourceinstanceid: string;
    label: string;
}

const resourceOption: ResourceOption = { resourceinstanceid: '', label: '' };

export type ResourceOptionType = typeof resourceOption;

export interface ResourceSearchResults {
    'paging-filter': object;
    'total-hits': number;
    results: Array<ResourceOption>;
}

const resourceSearchResults: ResourceSearchResults = {
    'paging-filter': {},
    'total-hits': 0,
    results: [],
};

export type ResourceSearchResultsType = typeof resourceSearchResults;

export interface ConceptOption {
    id: string;
    text: string;
}

// Audit/Edit Log Types
export interface EditLogResponse {
    modified_on: string | null;
    modified_by: string | null;
    transaction_id?: string | null;
    edit_type?: string | null;
    user_email?: string | null;
    is_system_edit?: boolean;
    method_used?: string;
    error?: string;
    tile_id?: string | null;
    nodegroup_id?: string | null;
}

export interface EditLogEntry {
    entered_on: string | null;
    entered_by: string | null;
}

export type EditLogData = Record<string, EditLogEntry>;

export interface AliasedNodeDataWithAudit extends AliasedNodeData {
    audit?: EditLogEntry;
}

export interface AliasedTileDataWithAudit extends Omit<AliasedTileData, 'aliased_data'> {
    audit?: EditLogEntry;
    aliased_data: Record<string, AliasedNodeDataWithAudit | AliasedNodegroupData | null>;
}
