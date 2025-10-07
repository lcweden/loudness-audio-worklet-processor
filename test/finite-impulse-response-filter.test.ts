import { beforeEach, describe, expect, it } from "vitest";
import { FiniteImpulseResponseFilter } from "../src/finite-impulse-response-filter";

describe("FiniteImpulseResponseFilter", () => {
  let filter: FiniteImpulseResponseFilter;

  beforeEach(() => {
    // Simple pass-through filter: [1]
    filter = new FiniteImpulseResponseFilter([1]);
  });

  describe("constructor", () => {
    it("should create a new filter with given coefficients", () => {
      const newFilter = new FiniteImpulseResponseFilter([1, 0.5, 0.25]);
      expect(newFilter).toBeInstanceOf(FiniteImpulseResponseFilter);
    });

    it("should initialize with zero state", () => {
      const output = filter.process(0);
      expect(output).toBe(0);
    });

    it("should accept single coefficient", () => {
      const singleCoeffFilter = new FiniteImpulseResponseFilter([2]);
      const output = singleCoeffFilter.process(1);
      expect(output).toBe(2);
    });

    it("should accept multiple coefficients", () => {
      const multiCoeffFilter = new FiniteImpulseResponseFilter([1, 2, 3, 4, 5]);
      expect(multiCoeffFilter).toBeInstanceOf(FiniteImpulseResponseFilter);
    });
  });

  describe("process - single sample", () => {
    it("should pass through input with identity coefficient [1]", () => {
      const output = filter.process(0.5);
      expect(output).toBeCloseTo(0.5, 10);
    });

    it("should scale input with gain coefficient", () => {
      const gainFilter = new FiniteImpulseResponseFilter([2]);
      const output = gainFilter.process(0.5);
      expect(output).toBeCloseTo(1.0, 10);
    });

    it("should implement moving average with equal coefficients", () => {
      // 3-point moving average: [1/3, 1/3, 1/3]
      const avgFilter = new FiniteImpulseResponseFilter([1 / 3, 1 / 3, 1 / 3]);

      avgFilter.process(1); // buffer: [1, 0, 0]
      avgFilter.process(2); // buffer: [2, 1, 0]
      const output = avgFilter.process(3); // buffer: [3, 2, 1]

      // Average of [3, 2, 1] = 2
      expect(output).toBeCloseTo(2, 10);
    });

    it("should maintain filter state between calls", () => {
      const delayFilter = new FiniteImpulseResponseFilter([0, 1]); // 1-sample delay

      const out1 = delayFilter.process(1); // output previous buffer[1] = 0
      expect(out1).toBe(0);

      const out2 = delayFilter.process(2); // output previous buffer[1] = 1
      expect(out2).toBe(1);

      const out3 = delayFilter.process(3); // output previous buffer[1] = 2
      expect(out3).toBe(2);
    });

    it("should handle negative inputs correctly", () => {
      const output = filter.process(-0.5);
      expect(output).toBeCloseTo(-0.5, 10);
    });

    it("should handle zero inputs correctly", () => {
      const output = filter.process(0);
      expect(output).toBe(0);
    });

    it("should apply weighted sum correctly", () => {
      const weightedFilter = new FiniteImpulseResponseFilter([0.5, 0.3, 0.2]);

      weightedFilter.process(1); // buffer: [1, 0, 0] -> 0.5
      weightedFilter.process(2); // buffer: [2, 1, 0] -> 1.0 + 0.3 = 1.3
      const output = weightedFilter.process(3); // buffer: [3, 2, 1] -> 1.5 + 0.6 + 0.2 = 2.3

      expect(output).toBeCloseTo(2.3, 10);
    });

    it("should handle long coefficient arrays", () => {
      const longCoeffs = Array(100).fill(0.01);
      const longFilter = new FiniteImpulseResponseFilter(longCoeffs);

      // Fill buffer
      for (let i = 0; i < 100; i++) {
        longFilter.process(1);
      }

      const output = longFilter.process(1);
      // Sum of 100 samples * 0.01 = 1.0
      expect(output).toBeCloseTo(1.0, 10);
    });
  });

  describe("process - multiple samples", () => {
    it("should process array of samples", () => {
      const inputs = [1, 2, 3, 4, 5];
      const outputs = filter.process(inputs);

      expect(outputs).toEqual(inputs);
      expect(outputs).toHaveLength(5);
    });

    it("should process empty array", () => {
      const outputs = filter.process([]);
      expect(outputs).toEqual([]);
    });

    it("should process single-element array", () => {
      const outputs = filter.process([1]);
      expect(outputs).toEqual([1]);
    });

    it("should maintain state across array processing", () => {
      const avgFilter = new FiniteImpulseResponseFilter([0.5, 0.5]);

      const outputs = avgFilter.process([1, 2, 3, 4]);

      // [1, 0] -> 0.5
      // [2, 1] -> 1.5
      // [3, 2] -> 2.5
      // [4, 3] -> 3.5
      expect(outputs[0]).toBeCloseTo(0.5, 10);
      expect(outputs[1]).toBeCloseTo(1.5, 10);
      expect(outputs[2]).toBeCloseTo(2.5, 10);
      expect(outputs[3]).toBeCloseTo(3.5, 10);
    });

    it("should handle negative values in array", () => {
      const inputs = [-1, -2, -3];
      const outputs = filter.process(inputs);

      expect(outputs).toEqual(inputs);
    });

    it("should handle mixed positive and negative values", () => {
      const avgFilter = new FiniteImpulseResponseFilter([0.5, 0.5]);
      const inputs = [1, -1, 2, -2];
      const outputs = avgFilter.process(inputs);

      expect(outputs[0]).toBeCloseTo(0.5, 10); // [1, 0]
      expect(outputs[1]).toBeCloseTo(0, 10); // [-1, 1]
      expect(outputs[2]).toBeCloseTo(0.5, 10); // [2, -1]
      expect(outputs[3]).toBeCloseTo(0, 10); // [-2, 2]
    });

    it("should process large arrays efficiently", () => {
      const largeArray = Array(1000).fill(1);
      const outputs = filter.process(largeArray);

      expect(outputs).toHaveLength(1000);
      expect(outputs.every((v) => v === 1)).toBe(true);
    });
  });

  describe("reset", () => {
    it("should clear filter state", () => {
      const delayFilter = new FiniteImpulseResponseFilter([0, 1]);

      // Build up state
      delayFilter.process(1);
      delayFilter.process(2);
      delayFilter.process(3);

      // Reset
      delayFilter.reset();

      // After reset, should output 0 (buffer is cleared)
      const output = delayFilter.process(5);
      expect(output).toBe(0);
    });

    it("should reset buffer to all zeros", () => {
      const avgFilter = new FiniteImpulseResponseFilter([1, 1, 1]);

      // Fill buffer with non-zero values
      avgFilter.process(5);
      avgFilter.process(10);
      avgFilter.process(15);

      // Reset
      avgFilter.reset();

      // First output should only use new input (buffer is zeros)
      const output = avgFilter.process(1);
      expect(output).toBe(1); // 1*1 + 1*0 + 1*0 = 1
    });

    it("should allow filter to work normally after reset", () => {
      filter.process(100);
      filter.reset();

      const output = filter.process(1);
      expect(output).toBeCloseTo(1, 10);
    });

    it("should work correctly with multiple resets", () => {
      const testFilter = new FiniteImpulseResponseFilter([1, 1]);

      testFilter.process(5);
      testFilter.reset();
      testFilter.process(3);
      testFilter.reset();

      const output = testFilter.process(2);
      expect(output).toBe(2); // Only current input
    });
  });

  describe("edge cases", () => {
    it("should handle very small numbers", () => {
      const output = filter.process(1e-10);
      expect(output).toBeCloseTo(1e-10, 15);
    });

    it("should handle very large numbers", () => {
      const output = filter.process(1e10);
      expect(output).toBeCloseTo(1e10, -5);
    });

    it("should handle zero coefficients", () => {
      const zeroFilter = new FiniteImpulseResponseFilter([0, 0, 0]);
      const output = zeroFilter.process(100);
      expect(output).toBe(0);
    });

    it("should handle negative coefficients", () => {
      const negFilter = new FiniteImpulseResponseFilter([-1, -0.5]);
      negFilter.process(2); // buffer: [2, 0] -> -2
      const output = negFilter.process(4); // buffer: [4, 2] -> -4 - 1 = -5

      expect(output).toBeCloseTo(-5, 10);
    });

    it("should handle alternating signs in coefficients", () => {
      const altFilter = new FiniteImpulseResponseFilter([1, -1, 1, -1]);
      altFilter.process(1); // [1, 0, 0, 0] -> 1
      altFilter.process(1); // [1, 1, 0, 0] -> 0
      altFilter.process(1); // [1, 1, 1, 0] -> 1
      const output = altFilter.process(1); // [1, 1, 1, 1] -> 0

      expect(output).toBe(0);
    });

    it("should handle fractional coefficients", () => {
      const fracFilter = new FiniteImpulseResponseFilter([0.1, 0.2, 0.3, 0.4]);
      const output = fracFilter.process([1, 1, 1, 1]);

      expect(output[3]).toBeCloseTo(1.0, 10); // 0.1 + 0.2 + 0.3 + 0.4 = 1.0
    });

    it("should produce consistent results with repeated inputs", () => {
      const consistentFilter = new FiniteImpulseResponseFilter([0.25, 0.25, 0.25, 0.25]);

      // Process same value multiple times
      consistentFilter.process(4);
      consistentFilter.process(4);
      consistentFilter.process(4);
      const output = consistentFilter.process(4);

      // Average of [4, 4, 4, 4] = 4
      expect(output).toBeCloseTo(4, 10);
    });

    it("should handle impulse response correctly", () => {
      const impulseFilter = new FiniteImpulseResponseFilter([1, 0.5, 0.25]);

      const out1 = impulseFilter.process(1); // impulse
      const out2 = impulseFilter.process(0);
      const out3 = impulseFilter.process(0);
      const out4 = impulseFilter.process(0);

      expect(out1).toBeCloseTo(1, 10); // [1, 0, 0]
      expect(out2).toBeCloseTo(0.5, 10); // [0, 1, 0]
      expect(out3).toBeCloseTo(0.25, 10); // [0, 0, 1]
      expect(out4).toBeCloseTo(0, 10); // [0, 0, 0]
    });
  });

  describe("special filter types", () => {
    it("should implement delay line", () => {
      const delayFilter = new FiniteImpulseResponseFilter([0, 0, 0, 1]); // 3-sample delay

      delayFilter.process(1);
      delayFilter.process(2);
      delayFilter.process(3);
      const output = delayFilter.process(4);

      expect(output).toBe(1); // Output is input from 3 samples ago
    });

    it("should implement differentiator", () => {
      const diffFilter = new FiniteImpulseResponseFilter([1, -1]);

      diffFilter.process(1); // [1, 0] -> 1
      diffFilter.process(3); // [3, 1] -> 2
      const output = diffFilter.process(6); // [6, 3] -> 3

      expect(output).toBe(3); // Difference between consecutive samples
    });

    it("should implement simple low-pass filter", () => {
      // Simple 5-point moving average (low-pass characteristic)
      const lpFilter = new FiniteImpulseResponseFilter([0.2, 0.2, 0.2, 0.2, 0.2]);

      // Fill with ones
      for (let i = 0; i < 5; i++) {
        lpFilter.process(1);
      }

      const output = lpFilter.process(1);
      expect(output).toBeCloseTo(1, 10); // Average of ones is one
    });

    it("should sum coefficients correctly for DC gain", () => {
      // Coefficients that sum to 2
      const gainFilter = new FiniteImpulseResponseFilter([0.5, 0.5, 0.5, 0.5]);

      // Fill buffer with ones
      gainFilter.process(1);
      gainFilter.process(1);
      gainFilter.process(1);
      const output = gainFilter.process(1);

      expect(output).toBeCloseTo(2, 10); // Sum of coefficients
    });
  });
});
