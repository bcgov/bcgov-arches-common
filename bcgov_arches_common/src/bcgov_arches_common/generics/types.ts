export interface AllowableWidgetOverrides {
    label?: string;
    node?: {
        isrequired?: boolean;
    };
    config?: {
        defaultValue?: unknown | null;
        placeholder?: string;
    };
    widget?: {
        component: string;
    };
}
