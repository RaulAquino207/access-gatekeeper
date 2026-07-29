import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import {
    Duration,
    DEFAULT_DURATION_MINUTES,
    MIN_DURATION_MINUTES,
    MAX_DURATION_MINUTES,
} from './duration';

describe('Duration', () => {
    describe('create', () => {
        it('accepts a valid integer within range', () => {
            const result = Duration.create(30);

            expect(E.isRight(result)).toBe(true);
            if (E.isRight(result)) {
                expect(result.right.minutes).toBe(30);
            }
        });

        it('accepts the min boundary', () => {
            const result = Duration.create(MIN_DURATION_MINUTES);

            expect(E.isRight(result)).toBe(true);
            if (E.isRight(result)) {
                expect(result.right.minutes).toBe(MIN_DURATION_MINUTES);
            }
        });

        it('accepts the max boundary', () => {
            const result = Duration.create(MAX_DURATION_MINUTES);

            expect(E.isRight(result)).toBe(true);
            if (E.isRight(result)) {
                expect(result.right.minutes).toBe(MAX_DURATION_MINUTES);
            }
        });

        it('rejects a fractional value', () => {
            const result = Duration.create(15.5);

            expect(E.isLeft(result)).toBe(true);
            if (E.isLeft(result)) {
                expect(result.left._tag).toBe('InvalidDurationError');
            }
        });

        it('rejects below the minimum', () => {
            const result = Duration.create(MIN_DURATION_MINUTES - 1);

            expect(E.isLeft(result)).toBe(true);
        });

        it('rejects above the maximum', () => {
            const result = Duration.create(MAX_DURATION_MINUTES + 1);

            expect(E.isLeft(result)).toBe(true);
        });
    });

    describe('default', () => {
        it('returns the default duration', () => {
            expect(Duration.default().minutes).toBe(DEFAULT_DURATION_MINUTES);
        });
    });
});
