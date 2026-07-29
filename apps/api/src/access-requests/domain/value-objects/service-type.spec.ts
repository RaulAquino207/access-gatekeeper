import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import { ServiceType } from './service-type';

describe('ServiceType', () => {
    describe('create', () => {
        it('accepts a supported service', () => {
            const result = ServiceType.create('SSH');

            expect(E.isRight(result)).toBe(true);
            if (E.isRight(result)) {
                expect(result.right.value).toBe('SSH');
            }
        });

        it('rejects an unsupported service', () => {
            const result = ServiceType.create('FTP');

            expect(E.isLeft(result)).toBe(true);
            if (E.isLeft(result)) {
                expect(result.left._tag).toBe('InvalidServiceTypeError');
            }
        });

        it('rejects an empty string', () => {
            const result = ServiceType.create('');

            expect(E.isLeft(result)).toBe(true);
        });

        it('is case-sensitive', () => {
            const result = ServiceType.create('ssh');

            expect(E.isLeft(result)).toBe(true);
        });
    });
});
