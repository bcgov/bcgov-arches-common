// Vitest's `Assertion<T>` is defined in `@vitest/expect` and merely
// re-exported by `vitest`. TypeScript's interface merging only works against
// the module where an interface is *declared*, so augmenting `vitest` has no
// effect. Augmenting `@vitest/expect` directly fixes the mapped-type depth
// limit that drops `.not` for complex types (e.g. maplibre-gl's `Map` class,
// which TypeScript renames `Map$1` to avoid shadowing the built-in `Map`).
//
// `export {}` is required to make this file a module; without it,
// `declare module` creates an ambient declaration that *replaces* the
// original types instead of merging with them.
export {};
declare module '@vitest/expect' {
    interface Assertion<T = any> {
        not: Assertion<T>;
        resolves: Assertion<T>;
        rejects: Assertion<T>;
    }
}
