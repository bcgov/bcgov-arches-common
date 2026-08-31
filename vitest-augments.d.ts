// Vitest's Assertion<T> receives `.not` through the recursive mapped type
// VitestAssertion<Chai.Assertion, T>.  For complex class constructor types
// (e.g. maplibre-gl's Map class, which TypeScript names Map$1 to disambiguate
// it from the built-in Map) TypeScript hits its mapped-type depth limit and
// truncates the result, dropping `.not` from the returned Assertion<T>.
//
// This augmentation re-adds `not` and `resolves` directly via interface
// merging so they are always present regardless of the subject's type.
//
// `export {}` is required to make TypeScript treat this file as a module;
// without it, `declare module 'vitest'` is an ambient declaration that
// replaces the original module types instead of merging with them.
export {};
declare module 'vitest' {
    interface Assertion<T = any> {
        not: Assertion<T>;
        resolves: Assertion<T>;
        rejects: Assertion<T>;
    }
}
