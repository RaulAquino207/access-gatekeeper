import * as E from 'fp-ts/Either';

export const SUPPORTED_SERVICES = ['SSH'] as const;
export type SupportedService = (typeof SUPPORTED_SERVICES)[number];

export interface InvalidServiceTypeError {
    readonly _tag: 'InvalidServiceTypeError';
    readonly message: string;
}

function isSupportedService(value: string): value is SupportedService {
    return (SUPPORTED_SERVICES as readonly string[]).includes(value);
}

export class ServiceType {
    public readonly value: SupportedService;
    private constructor(value: SupportedService) {
        this.value = value;
    }

    static create(
        value: string,
    ): E.Either<InvalidServiceTypeError, ServiceType> {
        if (!isSupportedService(value)) {
            return E.left({
                _tag: 'InvalidServiceTypeError',
                message: `Unsupported service. Allowed: ${SUPPORTED_SERVICES.join(', ')}`,
            });
        }

        return E.right(new ServiceType(value));
    }
}
