import { JSX, mergeProps, splitProps } from "solid-js";

function XMarkIcon(iconProps: JSX.IntrinsicElements["svg"]) {
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
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default XMarkIcon;
