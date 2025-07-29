import { createUniqueId, JSX, mergeProps } from "solid-js";

type FileSelectorProps = {
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
} & JSX.InputHTMLAttributes<HTMLInputElement>;

function FileSelector(fileSelectorProps: FileSelectorProps) {
  const props = mergeProps(fileSelectorProps);

  return (
    <label class={props.class} style={props.style}>
      {props.children || "Select File"}
      <input {...props} id={createUniqueId()} type="file" class="hidden" />
    </label>
  );
}

export { FileSelector };
