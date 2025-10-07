/**
 * Implements a simple biquadratic filter.
 */
class BiquadraticFilter {
  #a: Float32Array = new Float32Array(2);
  #b: Float32Array = new Float32Array(3);
  #x: Float32Array = new Float32Array(2);
  #y: Float32Array = new Float32Array(2);

  /**
   * Creates a new BiquadraticFilter with given coefficients.
   * @param { number[] } a - Feedback coefficients [a1, a2]
   * @param { number[] } b - Feedforward coefficients [b0, b1, b2]
   */
  constructor(a: number[], b: number[]) {
    this.reset();
    this.set(a, b);
  }

  /**
   * Processes a single input sample and returns the filtered output.
   * @param { number } input - The input sample.
   * @returns { number } - The filtered output sample.
   */
  process(input: number): number {
    const output =
      this.#b[0] * input +
      this.#b[1] * this.#x[0] +
      this.#b[2] * this.#x[1] -
      this.#a[0] * this.#y[0] -
      this.#a[1] * this.#y[1];

    this.#x[1] = this.#x[0];
    this.#x[0] = input;

    this.#y[1] = this.#y[0];
    this.#y[0] = output;

    return output;
  }

  /**
   * Sets new filter coefficients.
   * @param { number[] } a - Feedback coefficients [a1, a2]
   * @param { number[] } b - Feedforward coefficients [b0, b1, b2]
   * @returns { void }
   */
  set(a: number[], b: number[]): void {
    this.#a.set(((a.length = 2), a));
    this.#b.set(((b.length = 3), b));
  }

  /**
   * Resets the filter state.
   * @returns { void }
   */
  reset(): void {
    this.#x.fill(0);
    this.#y.fill(0);
  }
}

export { BiquadraticFilter };
