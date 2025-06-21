import { describe, expect, it } from 'vitest';
import { replaceIfEqual } from '../demo/utils/index';
import { calculateLufs } from '../src/utils';

describe('calculateLufs', () => {
  it('should return a finite number for positive energy', () => {
    expect(typeof calculateLufs(1)).toBe('number');
    expect(isFinite(calculateLufs(1))).toBe(true);
  });

  it('should calculate LUFS correctly for known values', () => {
    // For energy = 1, LUFS = -0.691 + 10 * log10(1) = -0.691
    expect(calculateLufs(1)).toBeCloseTo(-0.691, 5);
    // For energy = 10, LUFS = -0.691 + 10 * log10(10) = -0.691 + 10 = 9.309
    expect(calculateLufs(10)).toBeCloseTo(9.309, 5);
    // For energy = 0.1, LUFS = -0.691 + 10 * log10(0.1) = -0.691 - 10 = -10.691
    expect(calculateLufs(0.1)).toBeCloseTo(-10.691, 5);
  });

  it('should handle zero energy by using Number.EPSILON', () => {
    const result = calculateLufs(0);
    const expected = -0.691 + 10 * Math.log10(Number.EPSILON);
    expect(result).toBeCloseTo(expected, 5);
  });

  it('should handle negative energy by using Number.EPSILON', () => {
    const result = calculateLufs(-5);
    const expected = -0.691 + 10 * Math.log10(Number.EPSILON);
    expect(result).toBeCloseTo(expected, 5);
  });

  it('should handle extremely large energy values', () => {
    const largeEnergy = 1e12;
    const result = calculateLufs(largeEnergy);
    const expected = -0.691 + 10 * Math.log10(largeEnergy);
    expect(result).toBeCloseTo(expected, 5);
  });
});

describe('replaceIfEqual', () => {
  it('returns the replacement when value is strictly equal to compare (number)', () => {
    expect(replaceIfEqual(5, 5, 10)).toBe(10);
  });

  it('returns the value when value is not strictly equal to compare (number)', () => {
    expect(replaceIfEqual(5, 6, 10)).toBe(5);
  });

  it('returns the replacement when value is strictly equal to compare (string)', () => {
    expect(replaceIfEqual('a', 'a', 'b')).toBe('b');
  });

  it('returns the value when value is not strictly equal to compare (string)', () => {
    expect(replaceIfEqual('a', 'b', 'c')).toBe('a');
  });

  it('returns the replacement when value is strictly equal to compare (boolean)', () => {
    expect(replaceIfEqual(true, true, false)).toBe(false);
  });

  it('returns the value when value is not strictly equal to compare (boolean)', () => {
    expect(replaceIfEqual(false, true, true)).toBe(false);
  });

  it('returns the replacement when value is strictly equal to compare (null)', () => {
    expect(replaceIfEqual(null, null, 'replacement')).toBe('replacement');
  });

  it('returns the value when value is not strictly equal to compare (null vs undefined)', () => {
    expect(replaceIfEqual(null, undefined, 'replacement')).toBe(null);
  });

  it('returns the replacement when value is strictly equal to compare (object reference)', () => {
    const obj = { a: 1 };
    expect(replaceIfEqual(obj, obj, 'replaced')).toBe('replaced');
  });

  it('returns the value when value is not strictly equal to compare (different object references)', () => {
    expect(replaceIfEqual({ a: 1 }, { a: 1 }, 'replaced')).toEqual({ a: 1 });
  });

  it('works with different types for replacement', () => {
    expect(replaceIfEqual(1, 1, 'one')).toBe('one');
    expect(replaceIfEqual('x', 'y', 42)).toBe('x');
  });
});
