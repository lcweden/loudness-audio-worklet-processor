class CircularBuffer<T> {
  #buffer: T[];
  #capacity: number;
  #head: number = 0;
  #tail: number = 0;
  #size: number = 0;

  constructor(capacity: number) {
    this.#capacity = capacity ? capacity : 0;
    this.#buffer = new Array(capacity);
  }

  push(item: T): void {
    this.#buffer[this.#tail] = item;

    if (this.isFull()) {
      this.#head = (this.#head + 1) % this.#capacity;
    } else {
      this.#size++;
    }

    this.#tail = (this.#tail + 1) % this.#capacity;
  }

  pop(): T | undefined {
    if (this.isEmpty()) {
      return;
    }

    const item = this.#buffer[this.#head];
    this.#head = (this.#head + 1) % this.#capacity;
    this.#size--;

    return item;
  }

  peek(): T | undefined {
    if (this.isEmpty()) {
      return;
    }

    return this.#buffer[this.#head];
  }

  slice(start: number = 0, end: number = this.#size): T[] {
    if (start < 0) {
      start = 0;
    }

    if (end > this.#size) {
      end = this.#size;
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

  isEmpty(): boolean {
    return this.#size === 0;
  }

  isFull(): boolean {
    return this.#size === this.#capacity;
  }

  get size(): number {
    return this.#size;
  }

  get capacity(): number {
    return this.#capacity;
  }
}

export { CircularBuffer };
