import Ajv, { type AnySchemaObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Shared schema validator, per documentation/16-data-and-schema-model.md
 * ("Schema families" / "Schema versioning"). Every portable record schema
 * in this repository compiles through this one Ajv instance so options
 * (strict mode, formats, error verbosity) stay consistent everywhere.
 */
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

export function createValidator<T>(schema: AnySchemaObject): ValidateFunction<T> {
  return ajv.compile<T>(schema);
}

export function describeErrors(validate: ValidateFunction<unknown>): string {
  return (validate.errors ?? [])
    .map((error) => `${error.instancePath || '<root>'} ${error.message ?? ''}`.trim())
    .join('; ');
}
