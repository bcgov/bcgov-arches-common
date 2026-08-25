# Migrating to arches-vue-components (bcgov-arches-common 2.1.0)

`arches-component-lab` is now `arches-vue-components` 2.0.2, on Arches 8.1.2.
BCAP (`nr-bcap`, branch `ts/feat/1659_arches_vue_component_upgrade`) is migrated
already, so read it as the worked example.

## Config

- `package.json`: drop `arches-component-lab`, add
  `"arches-vue-components": "archesproject/arches-vue-components#2.0.2"` and
  `"pinia": "^3.0.4"`; `arches` → `bcgov/arches#stable/8.1.2_bcgov_12776`,
  `arches-querysets` → `#v1.1.0a1`, `arches-dev-dependencies` → `#stable/8.0.8`.
- `pyproject.toml`: `arches-vue-components==2.0.2`, arches
  `@stable/8.1.2_bcgov_12776`, `requires-python = ">=3.11"`.
- `settings.py` / `urls.py`: `arches_component_lab` → `arches_vue_components`.
- `tsconfig.json` + `vitest.config.mts` alias:
  `"@/arches_vue_components/*": ["./node_modules/arches-vue-components/arches_vue_components/src/arches_vue_components/*"]`.

The app must also be on Arches 8.1.2 first. That upgrade has its own settings,
build and template changes; follow the Arches 8.1 release notes for those.

Delete `node_modules` and the lockfile before reinstalling, since both packages
export the same module names and a stale lock resolves both.

## Source

```bash
grep -rl arches_component_lab <app>/src | xargs sed -i 's/arches_component_lab/arches_vue_components/g'
```

Then the rest:

| Old | New |
| --- | --- |
| `BooleanValue`, `FileListValue`, `…Value` | `BooleanAliasedNodeData`, `FileListAliasedNodeData`, `…AliasedNodeData` |
| `@update:value` | `@update:aliased-node-data` (payload is the whole node data) |
| `shouldEmitSimplifiedValue` prop | gone (bcgov widgets emit both events) |
| `fetchCardXNodeXWidgetData()` | `useWidgetConfig()` from `@/bcgov_arches_common/composables/useWidgetConfig.ts` |
| `widgets/SimpleMap/…` | `widgets/SimpleMapWidget/SimpleMapWidget.vue` (`components/SimpleMap` did not move) |

**Pinia is required.** Widget config comes from `useWidgetConfigStore`, so every
Vue root, KO-mounted ones included, needs `app.use(pinia)`, one shared instance
so the config cache is not refetched per mount. See
`bcap/src/bcap/primevue-theme-global.ts`. A missing pinia looks like a blank
widget plus a store injection error. In tests, mock the store, not the old api
module:

```ts
const fetchWidgetConfig = vi.fn();
vi.mock('@/arches_vue_components/stores/useWidgetConfigStore.ts', () => ({
    useWidgetConfigStore: () => ({ fetchWidgetConfig }),
}));
```

**Every custom widget must emit `initialized`** (new in 2.0.2, easiest to miss).
`GenericWidget` renders its slot under `v-show="isWidgetInitialized"`, so a widget
that never emits it sits behind a skeleton forever. The payload doubles as the
dirty-state baseline, so emit the stored value or a blank node data:

```ts
onMounted(() =>
    emit('initialized', props.aliasedNodeData ?? { display_value: '', node_value: null, details: [] }),
);
```

Done here for `BooleanCheckboxWidget` and `MapDropZoneWidget`; audit app-local widgets.

Verify with `npm run ts:check && npm run vitest && npm run build_development`,
then load a resource editor page.

## Per-app

- **BCAP**: migrated; just repoint `bcgov_arches_common` off
  `#update_to_arches_vue_components` once 2.1.0 ships.
- **BCFMS** (pinned `v2.0.2`): not started, but light. Mostly validation/zod
  helpers, which are untouched. One hard break, `widgets/SimpleMap/types.ts` in
  `src/bcfms/ipa/**`, plus all the config changes.
- **BCRHP** (pinned `v2.0.7`): not started, and the biggest job. Only app using
  all three bcgov widgets, so it needs the `initialized` audit and an
  `@update:value` sweep across `src/bcrhp/pages/SiteSubmission/steps/*`; ~20
  `src/bcrhp/schemas/**` files import `*Value` types; its step tests mock the
  moved `widgets/SimpleMap/api.ts`. Vite build, so the alias is in
  `vite.config.mjs`; its `Dockerfile` copies `arches-component-lab` into
  `ARCHES_COMPONENT_LAB_ROOT`; `urls.py` shadows an `arches_component_lab` route.

## Appendix: what each app imports

Anything not listed is unused downstream so far.

| Shared thing | BCAP | BCFMS | BCRHP |
| --- | --- | --- | --- |
| `types.ts` / `constants.ts` / `api.ts` / `routes.ts` | heavy | light | light |
| `components/StandardDataTable` | yes | no | no |
| `composables/useTileEditLog` + `components/EditLog` | yes | no | no |
| `components/card` | ProjectCard | SideCard, CenterCard | CenterCard |
| `components/labelledinput` | LabelledInput | LabelledInput | LabelledInput, LabelledCheckbox |
| `components/Stepper` (StepperNavigation) | yes | yes | yes |
| `components/MultiFileUploader` | yes | no | no |
| `components/SimpleMap` (component) | yes | no | no |
| `widgets/SimpleMapWidget` | no | types only | yes |
| `widgets/BooleanCheckboxWidget`, `widgets/MapDropZoneWidget` | no | no | yes |
| `validation-utils.ts` + `datatypes/*/validation/zod.ts` | light | heavy | heavy |
| `datatypes/tile.ts`, other `datatypes/*` types, `utils/document.ts` | yes | yes | heavy |
| `css/arches_common.css` | yes | yes | yes |
