import { describe, expect, it } from 'vitest';
import { replaceIfEqual } from '../demo/utils/index';

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
