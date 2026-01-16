// datatypes/resource-instance-list/validation/zod.test.ts
import { describe, it, expect } from 'vitest';
import {
    ResourceInstanceListValueSchema,
    ResourceInstanceListValueRequiredSchema,
} from './zod';

// Reuse the same shapes that ResourceInstanceReferenceSchema / DetailsSchema expect.
// (We keep these as "realistic" Arches-like objects, but minimal.)
const validRef = (overrides: Partial<any> = {}) => ({
    resourceId: '3c144c58-3e36-4f1f-965f-2c88f18c2a0d',
    ontologyClass: 'E18 Physical Thing',
    ...overrides,
});

const validDetails = (overrides: Partial<any> = {}) => ({
    resourceId: '3c144c58-3e36-4f1f-965f-2c88f18c2a0d',
    displayname: 'Foo Resource',
    graphid: '7b1f2a9e-4d6c-4a1e-9f18-6c8a0d8e2f77',
    ...overrides,
});

const validResourceInstanceList = (overrides: Partial<any> = {}) => ({
    display_value: 'Foo Resource; Bar Resource',
    node_value: [
        validRef(),
        validRef({ resourceId: '7b1f2a9e-4d6c-4a1e-9f18-6c8a0d8e2f77' }),
    ],
    details: [
        validDetails(),
        validDetails({
            resourceId: '7b1f2a9e-4d6c-4a1e-9f18-6c8a0d8e2f77',
            displayname: 'Bar Resource',
        }),
    ],
    ...overrides,
});

describe('ResourceInstanceListValueSchema (ResourceInstanceListValue)', () => {
    it('parses a valid ResourceInstanceListValue object', () => {
        const parsed = ResourceInstanceListValueSchema.parse(
            validResourceInstanceList(),
        );
        expect(parsed.display_value).toBe('Foo Resource; Bar Resource');
        expect(Array.isArray(parsed.node_value)).toBe(true);
        expect(parsed.node_value.length).toBe(2);
        expect(Array.isArray(parsed.details)).toBe(true);
        expect(parsed.details.length).toBe(2);
    });

    it('rejects when display_value is not a string', () => {
        const bad = validResourceInstanceList({ display_value: 123 });
        expect(() =>
            ResourceInstanceListValueSchema.parse(bad as any),
        ).toThrow();
    });

    it('rejects when node_value contains an invalid reference object', () => {
        const badRef = { ...validRef(), resourceId: 123 }; // should be string/uuid per referenced schema
        const bad = validResourceInstanceList({ node_value: [badRef] });
        expect(() => ResourceInstanceListValueSchema.parse(bad)).toThrow();
    });

    it('rejects when details contains an invalid details object', () => {
        const badDetails = { ...validDetails(), displayname: 42 }; // should be string per referenced schema
        const bad = validResourceInstanceList({ details: [badDetails] });
        expect(() => ResourceInstanceListValueSchema.parse(bad)).toThrow();
    });
});

describe('ResourceInstanceListValueRequiredSchema (node_value required, min 1)', () => {
    it('accepts when node_value contains at least one reference', () => {
        const parsed = ResourceInstanceListValueRequiredSchema.parse(
            validResourceInstanceList({ node_value: [validRef()] }),
        );
        expect(parsed.node_value.length).toBe(1);
    });

    it('rejects empty node_value array', () => {
        const empty = validResourceInstanceList({ node_value: [] });
        expect(() =>
            ResourceInstanceListValueRequiredSchema.parse(empty),
        ).toThrow();
    });

    it('still rejects invalid reference objects even when non-empty', () => {
        const badRef = { ...validRef(), resourceId: 'not-a-uuid' };
        const bad = validResourceInstanceList({ node_value: [badRef] });
        expect(() =>
            ResourceInstanceListValueRequiredSchema.parse(bad),
        ).toThrow();
    });
});
