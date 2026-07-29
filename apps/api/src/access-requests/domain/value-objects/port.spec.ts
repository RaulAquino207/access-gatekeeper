import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import { Port } from './port';

describe('Port', () => {
    describe('create', () => {
        it('accepts a privileged port (e.g. SSH on 22)', () => {
            const result = Port.create(22);

            expect(E.isRight(result)).toBe(true);
            if (E.isRight(result)) {
                expect(result.right.number).toBe(22);
            }
        });

        it('accepts a high port (e.g. 2222)', () => {
            const result = Port.create(2222);

            expect(E.isRight(result)).toBe(true);
            if (E.isRight(result)) {
                expect(result.right.number).toBe(2222);
            }
        });

        it('accepts the min boundary (1)', () => {
            const result = Port.create(1);

            expect(E.isRight(result)).toBe(true);
        });

        it('accepts the max boundary (65535)', () => {
            const result = Port.create(65535);

            expect(E.isRight(result)).toBe(true);
        });

        it('rejects below the minimum (0)', () => {
            const result = Port.create(0);

            expect(E.isLeft(result)).toBe(true);
            if (E.isLeft(result)) {
                expect(result.left._tag).toBe('InvalidPortError');
            }
        });

        it('rejects above the maximum (65536)', () => {
            const result = Port.create(65536);

            expect(E.isLeft(result)).toBe(true);
        });

        it('rejects a fractional value', () => {
            const result = Port.create(22.5);

            expect(E.isLeft(result)).toBe(true);
        });
    });
});
