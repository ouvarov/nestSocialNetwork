import { ValidateBy, type ValidationOptions } from 'class-validator';

const MaxBytes = (maxBytes: number, options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'maxBytes',
      constraints: [maxBytes],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          Buffer.byteLength(value, 'utf8') <= maxBytes,
        defaultMessage: () => `$property must be at most ${maxBytes} bytes`,
      },
    },
    options,
  );

export { MaxBytes };
