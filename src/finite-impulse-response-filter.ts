/**
 * Implements a simple finite impulse response filter.
 */
class FiniteImpulseResponseFilter {
  #coefficients: number[];
  #buffer: number[];

  constructor(coefficients: number[]) {
    this.#coefficients = coefficients;
    this.#buffer = Array(coefficients.length).fill(0);
  }

  process(input: number): number;
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

  reset(): void {
    this.#buffer.fill(0);
  }
}

export { FiniteImpulseResponseFilter };
