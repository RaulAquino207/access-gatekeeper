import * as E from 'fp-ts/Either';

export const DEFAULT_DURATION_MINUTES = 30;
export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 120;

export interface InvalidDurationError {
    readonly _tag: 'InvalidDurationError';
    readonly message: string;
}

export class Duration {
    public readonly minutes: number;
    private constructor(minutes: number) {
        this.minutes = minutes;
    }

    static create(minutes: number): E.Either<InvalidDurationError, Duration> {
        if (
            !Number.isInteger(minutes) ||
            minutes < MIN_DURATION_MINUTES ||
            minutes > MAX_DURATION_MINUTES
        ) {
            return E.left({
                _tag: 'InvalidDurationError',
                message: `Duration must be an integer between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES} minutes`,
            });
        }

        return E.right(new Duration(minutes));
    }

    static default(): Duration {
        return new Duration(DEFAULT_DURATION_MINUTES);
    }
}
