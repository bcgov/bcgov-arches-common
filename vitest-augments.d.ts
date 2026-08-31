// Vitest's Assertion<T> receives `.not` through the recursive mapped type
// VitestAssertion<Chai.Assertion, T>.  For complex class constructor types
// (e.g. maplibre-gl's Map class, which TypeScript names Map$1 to disambiguate
// it from the built-in Map) TypeScript hits its mapped-type depth limit and
// truncates the result, dropping `.not` from the returned Assertion<T>.
//
// This augmentation re-adds `not` and `resolves` directly via interface
// merging so they are always present regardless of the subject's type.
declare module 'vitest' {
    interface Assertion<T = any> {
        not: Assertion<T>;
        resolves: Assertion<T>;
        rejects: Assertion<T>;
    }
}
