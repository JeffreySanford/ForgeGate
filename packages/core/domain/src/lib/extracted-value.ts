/**
 * Distinguishes the different reasons a field can be empty, per
 * documentation/16-data-and-schema-model.md ("Unknown and unsupported
 * values"). `null` alone cannot carry this distinction.
 */
export type ValueState =
  | 'absent'
  | 'unknown'
  | 'unsupported'
  | 'not-applicable'
  | 'inherited'
  | 'inferred'
  | 'confirmed';

export interface ExtractedValue<T> {
  readonly value: T | null;
  readonly state: ValueState;
  readonly source?: string;
  readonly reason?: string;
}

export function confirmedValue<T>(value: T, source: string): ExtractedValue<T> {
  return { value, state: 'confirmed', source };
}

export function inferredValue<T>(value: T, source: string, reason?: string): ExtractedValue<T> {
  return { value, state: 'inferred', source, reason };
}

export function unsupportedValue<T = never>(source: string, reason: string): ExtractedValue<T> {
  return { value: null, state: 'unsupported', source, reason };
}
