/**
 * Implements a simple circular buffer.
 */
class CircularBuffer<T> {
  #buffer: T[];
  #capacity: number;
  #head: number = 0;
  #tail: number = 0;
  #length: number = 0;

  /**
   * Creates a new CircularBuffer with given capacity.
   * @param { number } capacity - The maximum number of items the buffer can hold.
   */
  constructor(capacity: number) {
    this.#capacity = capacity ? capacity : 0;
    this.#buffer = new Array(capacity);
  }

  /**
   * Adds an item to the buffer.
   * @param item - The item to add to the buffer.
   * @returns { void }
   */
  push(item: T): void {
    this.#buffer[this.#tail] = item;

    if (this.isFull()) {
      this.#head = (this.#head + 1) % this.#capacity;
    } else {
      this.#length++;
    }

    this.#tail = (this.#tail + 1) % this.#capacity;
  }

  /**
   * Removes and returns the oldest item from the buffer.
   * @returns { T | undefined }
   */
  pop(): T | undefined {
    if (this.isEmpty()) {
      return;
    }

    const item = this.#buffer[this.#head];
    this.#head = (this.#head + 1) % this.#capacity;
    this.#length--;

    return item;
  }

  /**
   * Returns the oldest item from the buffer without removing it.
   * @returns { T | undefined }
   */
  peek(): T | undefined {
    if (this.isEmpty()) {
      return;
    }

    return this.#buffer[this.#head];
  }

  /**
   * Returns a slice of the buffer contents.
   * @param { number } start - The starting index of the slice (inclusive).
   * @param { number } end - The ending index of the slice (exclusive).
   * @returns { T[] }
   */
  slice(start: number = 0, end: number = this.#length): T[] {
    if (start < 0) {
      start = 0;
    }

    if (end > this.#length) {
      end = this.#length;
    }

    if (start >= end) {
      return [];
    }

    const result: T[] = [];

    for (let i = start; i < end; i++) {
      const index = (this.#head + i) % this.#capacity;
      result.push(this.#buffer[index]);
    }

    return result;
  }

  /**
   * Checks if the buffer is empty.
   * @returns { boolean }
   */
  isEmpty(): boolean {
    return this.#length === 0;
  }

  /**
   * Checks if the buffer is full.
   * @returns { boolean }
   */
  isFull(): boolean {
    return this.#length === this.#capacity;
  }

  /** @type { number } */
  get length(): number {
    return this.#length;
  }

  /** @type { number } */
  get capacity(): number {
    return this.#capacity;
  }

  /** @type { IterableIterator<T> } */
  *[Symbol.iterator](): IterableIterator<T> {
    for (let i = 0; i < this.#length; i++) {
      const index = (this.#head + i) % this.#capacity;
      yield this.#buffer[index];
    }
  }
}

export { CircularBuffer };
