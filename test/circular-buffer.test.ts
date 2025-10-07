import { describe, expect, it } from "vitest";
import { CircularBuffer } from "../src/circular-buffer";

describe("CircularBuffer", () => {
  it("initial state", () => {
    const buf = new CircularBuffer<number>(3);
    expect(buf.length).toBe(0);
    expect(buf.isEmpty()).toBe(true);
    expect(buf.isFull()).toBe(false);
    expect(buf.capacity).toBe(3);
  });

  it("push within capacity", () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    expect(buf.length).toBe(2);
    expect([...buf]).toEqual([1, 2]);
  });

  it("push over capacity overwrites oldest", () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);
    expect(buf.length).toBe(3);
    expect([...buf]).toEqual([2, 3, 4]);
  });

  it("pop order and empty end state", () => {
    const buf = new CircularBuffer<number>(3);
    buf.push(10);
    buf.push(11);
    expect(buf.pop()).toBe(10);
    expect(buf.pop()).toBe(11);
    expect(buf.pop()).toBeUndefined();
    expect(buf.isEmpty()).toBe(true);
  });

  it("peek does not remove", () => {
    const buf = new CircularBuffer<number>(2);
    buf.push(5);
    buf.push(6);
    expect(buf.peek()).toBe(5);
    expect(buf.length).toBe(2);
  });

  it("slice honors bounds and wrap", () => {
    const buf = new CircularBuffer<number>(4);
    buf.push(1);
    buf.push(2);
    buf.push(3);
    buf.push(4);
    buf.push(5); // overwrite 1
    // buffer logical: 2,3,4,5
    expect(buf.slice()).toEqual([2, 3, 4, 5]);
    expect(buf.slice(-10, 2)).toEqual([2, 3]); // start<0 trimmed
    expect(buf.slice(1, 100)).toEqual([3, 4, 5]); // end clamped
    expect(buf.slice(2, 2)).toEqual([]);
  });

  it("iterator matches slice", () => {
    const buf = new CircularBuffer<string>(3);
    ["a", "b", "c", "d"].forEach((x) => buf.push(x)); // now b,c,d
    expect([...buf]).toEqual(buf.slice());
  });
});
