import { beforeEach, describe, expect, it } from "vitest";
import { BiquadraticFilter } from "../src/biquadratic-filter";

describe("BiquadraticFilter", () => {
  let filter: BiquadraticFilter;

  beforeEach(() => {
    // Simple pass-through filter coefficients for basic testing
    // b = [1, 0, 0], a = [0, 0]
    filter = new BiquadraticFilter([0, 0], [1, 0, 0]);
  });

  describe("constructor", () => {
    it("should create a new filter with given coefficients", () => {
      const newFilter = new BiquadraticFilter([0.5, 0.25], [1, 0.5, 0.25]);
      expect(newFilter).toBeInstanceOf(BiquadraticFilter);
    });

    it("should initialize with zero state", () => {
      const output = filter.process(0);
      expect(output).toBe(0);
    });
  });

  describe("process", () => {
    it("should pass through input when using identity coefficients", () => {
      const input = 0.5;
      const output = filter.process(input);
      expect(output).toBeCloseTo(input, 10);
    });

    it("should process multiple samples correctly", () => {
      const inputs = [1, 2, 3, 4, 5];
      const outputs = inputs.map((input) => filter.process(input));
      expect(outputs).toEqual(inputs);
    });

    it("should apply low-pass filter coefficients correctly", () => {
      // Simple low-pass filter (approximate)
      // These coefficients create a basic averaging filter
      const lpFilter = new BiquadraticFilter([0, 0], [0.25, 0.5, 0.25]);

      lpFilter.process(0); // Initialize state
      lpFilter.process(1); // Ramp up
      const output = lpFilter.process(1);

      // Output should be smoothed (less than input due to averaging)
      expect(output).toBeGreaterThan(0);
      expect(output).toBeLessThanOrEqual(1);
    });

    it("should maintain filter state between calls", () => {
      const testFilter = new BiquadraticFilter([0.5, 0], [1, 0, 0]);

      const out1 = testFilter.process(1);
      const out2 = testFilter.process(0);

      // Second output should be affected by first input due to feedback
      expect(out2).not.toBe(0);
      expect(out2).toBeCloseTo(-0.5 * out1, 10);
    });

    it("should handle negative inputs correctly", () => {
      const output = filter.process(-0.5);
      expect(output).toBeCloseTo(-0.5, 10);
    });

    it("should handle zero inputs correctly", () => {
      const output = filter.process(0);
      expect(output).toBe(0);
    });
  });

  describe("set", () => {
    it("should update filter coefficients", () => {
      // Set to identity filter
      filter.set([0, 0], [1, 0, 0]);
      let output = filter.process(1);
      expect(output).toBeCloseTo(1, 10);

      // Change coefficients
      filter.reset();
      filter.set([0, 0], [0.5, 0, 0]);
      output = filter.process(1);
      expect(output).toBeCloseTo(0.5, 10);
    });

    it("should handle coefficient arrays with extra elements", () => {
      // The set method truncates arrays to correct length
      filter.set([0.1, 0.2, 0.3, 0.4], [1, 0.5, 0.25, 0.1, 0.05]);
      const output = filter.process(1);
      expect(output).toBeDefined();
      expect(typeof output).toBe("number");
    });

    it("should work with new coefficients immediately", () => {
      filter.set([0, 0], [2, 0, 0]);
      const output = filter.process(1);
      expect(output).toBeCloseTo(2, 10);
    });
  });

  describe("reset", () => {
    it("should clear filter state", () => {
      // Process some samples to build up state
      filter.set([-0.5, 0.25], [1, 0.5, 0.25]);
      filter.process(1);
      filter.process(1);
      filter.process(1);

      // Reset
      filter.reset();

      // After reset, same input should give same output as initial state
      filter.set([0, 0], [1, 0, 0]);
      const output = filter.process(0);
      expect(output).toBe(0);
    });

    it("should reset internal buffers to zero", () => {
      const testFilter = new BiquadraticFilter([0.9, 0], [1, 0, 0]);

      // Build up state
      testFilter.process(1);
      testFilter.process(1);

      // Reset
      testFilter.reset();

      // Process zero - should get zero if state is truly reset
      const output = testFilter.process(0);
      expect(output).toBe(0);
    });

    it("should allow filter to work normally after reset", () => {
      filter.process(1);
      filter.process(2);
      filter.reset();

      const output = filter.process(1);
      expect(output).toBeCloseTo(1, 10);
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

    it("should handle rapid coefficient changes", () => {
      filter.set([0, 0], [1, 0, 0]);
      filter.process(1);

      filter.set([0, 0], [0.5, 0, 0]);
      const output = filter.process(1);

      expect(output).toBeCloseTo(0.5, 10);
    });

    it("should produce stable output with feedback coefficients", () => {
      // Test with stable filter coefficients
      const stableFilter = new BiquadraticFilter([-0.1, 0.05], [0.3, 0.2, 0.1]);

      // Process enough samples to see if it remains stable
      let output = 0;
      for (let i = 0; i < 100; i++) {
        output = stableFilter.process(1);
      }

      // Output should be finite and not NaN
      expect(output).toBeDefined();
      expect(isFinite(output)).toBe(true);
      expect(isNaN(output)).toBe(false);
    });
  });
});
