import { Transform } from 'class-transformer';

const TrimmedString = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

const NormalizedEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );

export { NormalizedEmail, TrimmedString };
