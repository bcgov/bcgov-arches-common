export type ColumnDefinition = {
    field: string;
    label?: string;
    sortable?: boolean;
    visible?: boolean | (() => boolean);
    isHtml?: boolean;
};
