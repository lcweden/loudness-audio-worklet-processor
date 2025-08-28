import { JSX, mergeProps, splitProps } from "solid-js";

function MinusCircleIcon(iconProps: JSX.IntrinsicElements["svg"]) {
  const [local, others] = splitProps(iconProps, ["class"]);
  const props = mergeProps({ class: "size-5" }, local);
  return (
    <svg
      class={props.class}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1"
      stroke="currentColor"
      {...others}
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export default MinusCircleIcon;
