/**
 * Implements a simple finite impulse response filter.
 */
class FiniteImpulseResponseFilter {
  #coefficients: number[];
  #buffer: number[];

  /**
   * Creates an instance of the filter.
   * @param coefficients - The filter coefficients.
   */
  constructor(coefficients: number[]) {
    this.#coefficients = coefficients;
    this.#buffer = Array(coefficients.length).fill(0);
  }

  /**
   * Processes a single input sample.
   * @param {number} input - The input sample.
   * @returns {number} - The filtered output sample.
   */
  process(input: number): number;
  /**
   * Processes multiple input samples.
   * @param {number[]} inputs - The input samples.
   * @returns {number[]} - The filtered output samples.
   */
  process(inputs: number[]): number[];
  process(i: number | number[]): number | number[] {
    if (Array.isArray(i)) {
      const inputs = i;

      return inputs.map((input) => this.process(input));
    } else {
      const input = i;

      this.#buffer.pop();
      this.#buffer.unshift(input);

      let output = 0;

      for (let i = 0; i < this.#coefficients.length; i++) {
        output += this.#coefficients[i] * this.#buffer[i];
      }

      return output;
    }
  }

  /**
   * Resets the filter state.
   * @returns { void }
   */
  reset(): void {
    this.#buffer.fill(0);
  }
}

export { FiniteImpulseResponseFilter };
