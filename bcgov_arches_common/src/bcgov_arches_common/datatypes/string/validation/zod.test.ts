// zod.string.test.ts
import { describe, it, expect } from 'vitest';
import {
    StringValueSchema,
    StringValueRequiredSchema,
    getStringValueSchema,
    getStringValueRequiredSchema,
} from './zod';

// Helpers
const baseNode = (overrides: Partial<{ value: any; direction: any }> = {}) => ({
    en: { value: 'Hello', direction: 'ltr', ...overrides },
});
const base = (
    overrides: Partial<{ display_value: any; node_value: any }> = {},
) => ({
    display_value: 'Hello',
    node_value: baseNode(),
    ...overrides,
});

describe('StringValueSchema (optional value, required object)', () => {
    it('parses a valid object with en.value string and direction', () => {
        const parsed = StringValueSchema.parse(base());
        expect(parsed.display_value).toBe('Hello');
        expect(parsed.node_value.en.value).toBe('Hello');
        expect(parsed.node_value.en.direction).toBe('ltr');
    });

    it('accepts null for en.value (schema uses nullable())', () => {
        const parsed = StringValueSchema.parse(
            base({ node_value: baseNode({ value: null }) }),
        );
        expect(parsed.node_value.en.value).toBeNull();
    });

    it('rejects invalid direction values', () => {
        const bad = base({ node_value: baseNode({ direction: 'ttb' }) });
        expect(() => StringValueSchema.parse(bad)).toThrow();
    });

    it('rejects when node_value is null (schema expects an object)', () => {
        const bad = base({ node_value: null as any });
        expect(() => StringValueSchema.parse(bad)).toThrow();
    });

    it('rejects when "en" key is missing in node_value', () => {
        const bad = base({ node_value: {} as any });
        expect(() => StringValueSchema.parse(bad)).toThrow();
    });
});

describe('StringValueRequiredSchema (en.value required non-empty)', () => {
    it('parses when en.value is a non-empty string', () => {
        const parsed = StringValueRequiredSchema.parse(base());
        expect(parsed.node_value.en.value).toBe('Hello');
    });

    it('rejects empty string for en.value', () => {
        const bad = base({ node_value: baseNode({ value: '' }) });
        expect(() => StringValueRequiredSchema.parse(bad)).toThrow(
            /Value is required/i,
        );
    });

    it('rejects null for en.value in required schema', () => {
        const bad = base({ node_value: baseNode({ value: null }) });
        expect(() => StringValueRequiredSchema.parse(bad)).toThrow();
    });
});

describe('getStringValueSchema(maxLength)', () => {
    it('with maxLength=5, accepts strings up to 5 chars', () => {
        const Schema5 = getStringValueSchema(5);
        const ok = base({
            node_value: { en: { value: 'Hello', direction: 'ltr' } },
        });
        const parsed = Schema5.parse(ok);
        expect(parsed.node_value.en.value).toBe('Hello');
    });

    it('with maxLength=5, rejects longer strings', () => {
        const Schema5 = getStringValueSchema(5);
        const bad = base({
            node_value: { en: { value: 'Hellooo', direction: 'ltr' } },
        });
        expect(() => Schema5.parse(bad)).toThrow(/Maximum length is 5/);
    });

    it('with maxLength=0 (default), does not enforce max length', () => {
        const Schema0 = getStringValueSchema(); // no cap
        const ok = base({
            node_value: {
                en: { value: 'A very very long string', direction: 'ltr' },
            },
        });
        expect(() => Schema0.parse(ok)).not.toThrow();
    });

    it('with maxLength=5, still allows null for en.value (nullable in non-required)', () => {
        const Schema5 = getStringValueSchema(5);
        const okNull = base({
            node_value: { en: { value: null, direction: 'ltr' } },
        });
        const parsed = Schema5.parse(okNull);
        expect(parsed.node_value.en.value).toBeNull();
    });
});

describe('getStringValueRequiredSchema(maxLength)', () => {
    it('with maxLength=5, en.value must be non-empty and ≤5 chars', () => {
        const Req5 = getStringValueRequiredSchema(5);
        const ok = base({
            node_value: { en: { value: 'Hi!!!', direction: 'ltr' } },
        });
        const parsed = Req5.parse(ok);
        expect(parsed.node_value.en.value).toBe('Hi!!!');
    });

    it('with maxLength=5, rejects longer strings', () => {
        const Req5 = getStringValueRequiredSchema(5);
        const bad = base({
            node_value: { en: { value: 'TooLong', direction: 'ltr' } },
        });
        expect(() => Req5.parse(bad)).toThrow(/Maximum length is 5/);
    });

    // NOTE: In your current implementation, when maxLength > 0 the required schema
    // does `...min(1).max(max).nullable()`, which makes null pass despite "required".
    // This test documents the present behavior so you can decide whether to remove `.nullable()`.
    it('DOCUMENTS CURRENT BEHAVIOR: with maxLength>0, null is accepted due to `.nullable()`', () => {
        const Req5 = getStringValueRequiredSchema(5);
        const currentBehavior = base({
            node_value: { en: { value: null, direction: 'ltr' } },
        });
        const parsed = Req5.parse(currentBehavior);
        expect(parsed.node_value.en.value).toBeNull();
    });
});
