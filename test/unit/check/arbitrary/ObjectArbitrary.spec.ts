import * as assert from 'power-assert';
import * as fc from '../../../../lib/fast-check';

import Arbitrary from '../../../../src/check/arbitrary/definition/Arbitrary';
import MutableRandomGenerator from '../../../../src/random/generator/MutableRandomGenerator';
import { constant } from '../../../../src/check/arbitrary/ConstantArbitrary';
import { oneof } from '../../../../src/check/arbitrary/OneOfArbitrary';
import { anything, object, json, unicodeJson, ObjectConstraints } from '../../../../src/check/arbitrary/ObjectArbitrary';

import * as stubArb from '../../stubs/arbitraries';
import * as stubRng from '../../stubs/generators';
import { constants } from 'os';
import { debug } from 'util';

describe("ObjectArbitrary", () => {
    const assertShrinkedValue = (original, shrinked) => {
        assert.equal(typeof shrinked, typeof original);
        switch (typeof original) {
            case 'boolean':
                return assert.strictEqual(shrinked, false, 'Should have shrinked towards false');
            case 'number':
                if (isNaN(original))
                    return assert.ok(isNaN(shrinked), 'Should be unchanged equal to NaN');
                if (original === Number.MAX_VALUE || original === Number.MIN_VALUE
                        || original === Number.MAX_SAFE_INTEGER || original === Number.MIN_SAFE_INTEGER)
                    return assert.ok(shrinked === 0 || shrinked === original, 'Should have shrinked toward zero or be the same');
                return assert.strictEqual(shrinked, 0, 'Should have shrinked towards zero');
            case 'undefined':
                return assert.strictEqual(shrinked, undefined, 'Should have shrinked towards undefined');
            case 'string':
                return assert.strictEqual(shrinked, '', 'Should have shrinked towards empty string');
            default:
                if (original == null)
                    return assert.strictEqual(shrinked, null, 'Should have shrinked towards null');
                if (Array.isArray(original))
                    return assert.deepStrictEqual(shrinked, [], 'Should have shrinked towards empty array');
                assert.equal(typeof original, 'object');
                return assert.deepStrictEqual(shrinked, {}, 'Should have shrinked towards empty object');
        }
    };
    const checkCorrect = (allowedKeys, allowedValues) => {
        const check = (value) => {
            if (Array.isArray(value))
                return value.every(check);
            if (allowedValues.findIndex(v => v === value) !== -1)
                return true;
            const keys = Object.getOwnPropertyNames(value);
            return keys.every(k => allowedKeys.indexOf(k) !== -1 && check(value[k]));
        };
        return check;
    };
    const evaluateDepth = (value) => {
        if (Array.isArray(value))
            return 1 + value.map(evaluateDepth).reduce((p,c) => Math.max(p,c), 0);
        if (typeof value === 'string')
            return 0;
        const keys = Object.getOwnPropertyNames(value);
        return 1 + keys.map(k => evaluateDepth(value[k])).reduce((p,c) => Math.max(p,c), 0);
    };

    describe('anything', () => {
        it('Should only use provided keys and values', () => fc.assert(
            fc.property(fc.integer(),
                    fc.string(), fc.array(fc.string()),
                    fc.string(), fc.array(fc.string()), (seed, key0, keys, value0, values) => {
                const allowedKeys = [key0, ...keys];
                const allowedValues = [value0, ...values];
                const mrng = stubRng.mutable.fastincrease(seed);

                const keyArb = oneof(constant(key0), ...keys.map(constant));
                const baseArbs = [...allowedValues.map(constant)];
                const g = anything({key: keyArb, values: baseArbs}).generate(mrng).value;
                
                return checkCorrect(allowedKeys, allowedValues)(g);
            })
        ));
        it('Should respect the maximal depth parameter', () => fc.assert(
            fc.property(fc.integer(), fc.integer(0, 5),
                    fc.string(), fc.array(fc.string()),
                    fc.string(), fc.array(fc.string()), (seed, depth, key0, keys, value0, values) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const keyArb = oneof(constant(key0), ...keys.map(constant));
                const baseArbs = [constant(value0), ...values.map(constant)];
                const g = anything({key: keyArb, values: baseArbs, maxDepth: depth}).generate(mrng).value;
                return evaluateDepth(g) <= depth;
            })
        ));
        it('Should shrink towards minimal value of type', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                let shrinkable = anything().generate(mrng);
                const originalValue = shrinkable.value;
                while (shrinkable.shrink().has(v => true)[0]) {
                    shrinkable = shrinkable.shrink().next().value;
                }// only check one shrink path
                assertShrinkedValue(originalValue, shrinkable.value);
            })
        ));
    });
    describe('json', () => {
        it('Should produce strings', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const g = json().generate(mrng).value;
                return typeof g === 'string';
            })
        ));
        it('Should generate a parsable JSON', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                JSON.parse(json().generate(mrng).value);
            })
        ));
        it('Should shrink towards minimal value of type', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                let shrinkable = json().generate(mrng);
                const originalValue = shrinkable.value;
                while (shrinkable.shrink().has(v => true)[0]) {
                    shrinkable = shrinkable.shrink().next().value;
                }// only check one shrink path
                assert.equal(typeof shrinkable.value, 'string');
                assertShrinkedValue(JSON.parse(originalValue), JSON.parse(shrinkable.value));
            })
        ));
    });
    describe('unicodeJson', () => {
        it('Should produce strings', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const g = unicodeJson().generate(mrng).value;
                return typeof g === 'string';
            })
        ));
        it('Should generate a parsable JSON', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                JSON.parse(unicodeJson().generate(mrng).value);
            })
        ));
        it('Should shrink towards minimal value of type', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                let shrinkable = unicodeJson().generate(mrng);
                const originalValue = shrinkable.value;
                while (shrinkable.shrink().has(v => true)[0]) {
                    shrinkable = shrinkable.shrink().next().value;
                }// only check one shrink path
                assert.equal(typeof shrinkable.value, 'string');
                assertShrinkedValue(JSON.parse(originalValue), JSON.parse(shrinkable.value));
            })
        ));
    });
    describe('object', () => {
        it('Should generate an object', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const g = object().generate(mrng).value;
                return typeof g === 'object' && ! Array.isArray(g);
            })
        ));
        it('Should only use provided keys and values', () => fc.assert(
            fc.property(fc.integer(),
                    fc.string(), fc.array(fc.string()),
                    fc.string(), fc.array(fc.string()), (seed, key0, keys, value0, values) => {
                const allowedKeys = [key0, ...keys];
                const allowedValues = [value0, ...values];
                const mrng = stubRng.mutable.fastincrease(seed);

                const keyArb = oneof(constant(key0), ...keys.map(constant));
                const baseArbs = [...allowedValues.map(constant)];
                const g = object({key: keyArb, values: baseArbs}).generate(mrng).value;
                
                return checkCorrect(allowedKeys, allowedValues)(g);
            })
        ));
        it('Should respect the maximal depth parameter', () => fc.assert(
            fc.property(fc.integer(), fc.integer(0, 5),
                    fc.string(), fc.array(fc.string()),
                    fc.string(), fc.array(fc.string()), (seed, depth, key0, keys, value0, values) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const keyArb = oneof(constant(key0), ...keys.map(constant));
                const baseArbs = [constant(value0), ...values.map(constant)];
                const g = object({key: keyArb, values: baseArbs, maxDepth: depth}).generate(mrng).value;
                return evaluateDepth(g) <= depth +1;
            })
        ));
        it('Should shrink towards empty object', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                let shrinkable = object().generate(mrng);
                while (shrinkable.shrink().has(v => true)[0]) {
                    shrinkable = shrinkable.shrink().next().value;
                }// only check one shrink path
                return typeof shrinkable.value === 'object' && Object.keys(shrinkable.value).length === 0;
            })
        ));
    });
});