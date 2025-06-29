class Reference<T> {
  #value: T;
  constructor(value: T) {
    this.#value = value;
  }

  set(value: T) {
    this.#value = value;
  }

  get(): T {
    return this.#value;
  }
}

export { Reference };
