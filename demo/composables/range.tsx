import { createSignal } from "solid-js";

export function createRange() {
  const [getRange, setRange] = createSignal<[number, number] | undefined>(undefined);

  function select(index: number) {
    const range = getRange();
    if (!range) {
      setRange([index, index]);
    } else if (range[0] === index && range[1] === index) {
      setRange(undefined); // toggle off
    } else if (index < range[0]) {
      setRange([index, range[1]]);
    } else if (index > range[1]) {
      setRange([range[0], index]);
    } else if (index === range[0]) {
      setRange([index, index]);
    } else if (index === range[1]) {
      setRange([index, index]);
    } else {
      index - range[0] < range[1] - index ? setRange([range[0], index]) : setRange([index, range[1]]);
    }
  }

  function selectAll(count: number) {
    if (count > 0) setRange([0, count - 1]);
  }

  function clear() {
    setRange(undefined);
  }

  function isSelected(index: number) {
    const range = getRange();
    return !!range && index >= range[0] && index <= range[1];
  }

  return {
    getRange,
    select,
    selectAll,
    clear,
    isSelected
  };
}
