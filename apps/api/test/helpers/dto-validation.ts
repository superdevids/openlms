/**
 * Helper pengujian DTO (class-validator) — dipakai seluruh spec dto-<module>.
 * Pola: plainToInstance -> validate; expectDtoValid/expectDtoInvalid menegaskan
 * input valid lolos dan input invalid gagal dengan property/constraint yang tepat.
 */
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

export type DtoClass<T = unknown> = new () => T;

export async function validateDto<T>(
  cls: DtoClass<T>,
  data: Record<string, unknown>
): Promise<ValidationError[]> {
  const instance = plainToInstance(cls as new () => object, data as object);
  return validate(instance as object, { stopAtFirstError: false });
}

export async function expectDtoValid<T>(
  cls: DtoClass<T>,
  data: Record<string, unknown>
): Promise<ValidationError[]> {
  const errors = await validateDto(cls, data);
  expect(errors).toHaveLength(0);
  return errors;
}

export async function expectDtoInvalid<T>(
  cls: DtoClass<T>,
  data: Record<string, unknown>,
  opts: { property?: string; constraint?: string | RegExp } = {}
): Promise<ValidationError[]> {
  const errors = await validateDto(cls, data);
  expect(errors.length).toBeGreaterThan(0);
  const props = errors.map((e) => e.property);
  if (opts.property) {
    expect(props).toContain(opts.property);
  }
  if (opts.constraint) {
    const constraints = errors.flatMap((e) => (e.constraints ? Object.keys(e.constraints) : []));
    const constraint: string | RegExp = opts.constraint;
    if (constraint instanceof RegExp) {
      expect(constraints.some((c) => constraint.test(c))).toBe(true);
    } else {
      expect(constraints).toContain(constraint);
    }
  }
  return errors;
}
