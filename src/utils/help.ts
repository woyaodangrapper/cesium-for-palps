export function isEmptyString(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}
export function isEmptyArray<T>(value: T[] | null | undefined): boolean {
  return value === null || value === undefined || value.length === 0;
}

type EmptyCheckable = string | any[] | object | null | undefined;

export function isEmpty(value: EmptyCheckable): boolean {
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).length === 0;
  }
  return value === null || value === undefined;
}
