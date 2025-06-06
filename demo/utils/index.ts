function replaceIfEqual<T, R>(value: T, compare: T, replacement: R): T | R {
  return value === compare ? replacement : value;
}

export { replaceIfEqual };
