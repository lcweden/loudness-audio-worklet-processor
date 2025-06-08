/**
 * Returns the `replacement` value if `value` is strictly equal to `compare`, otherwise returns `value`.
 *
 * @typeParam T - The type of the input value and the value to compare against.
 * @typeParam R - The type of the replacement value.
 * @param value - The value to check for equality.
 * @param compare - The value to compare against.
 * @param replacement - The value to return if `value` is equal to `compare`.
 * @returns The `replacement` if `value === compare`, otherwise `value`.
 */
function replaceIfEqual<T, R>(value: T, compare: T, replacement: R): T | R {
  return value === compare ? replacement : value;
}

export { replaceIfEqual };
