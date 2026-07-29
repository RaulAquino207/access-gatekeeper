
import * as E from 'fp-ts/Either';

export interface InvalidPortError {
    readonly _tag: 'InvalidPortError',
    readonly message: string;
}

export class Port {

    public readonly number: number;
    private constructor(port: number) {
        this.number = port;
    }

    static create(port: number): E.Either<InvalidPortError, Port> {
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            return E.left({
                _tag: 'InvalidPortError',
                message: 'Port must be an integer between 1 and 65535'
            });
        }

        return E.right(new Port(port));
    }
}