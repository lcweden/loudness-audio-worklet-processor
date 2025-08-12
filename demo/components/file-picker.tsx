import { JSX, splitProps } from "solid-js";

type FilePickerProps = {
  children?: JSX.Element;
  class?: string;
} & JSX.InputHTMLAttributes<HTMLInputElement>;

function FilePicker(filePickerProps: FilePickerProps) {
  const [props, others] = splitProps(filePickerProps, ["children", "class"]);

  return (
    <label class={props.class}>
      {props.children || "Select File"}
      <input {...others} type="file" class="hidden" />
    </label>
  );
}

export { FilePicker };
