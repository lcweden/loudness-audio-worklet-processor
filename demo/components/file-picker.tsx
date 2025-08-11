import { JSX, splitProps } from "solid-js";

type FilePickerProps = {
  class?: string;
} & JSX.IntrinsicElements["input"];

function FilePicker(filePickerProps: FilePickerProps) {
  const [props, others] = splitProps(filePickerProps, ["class"]);

  return (
    <label class={props.class}>
      Select File
      <input type="file" {...others} class="hidden" />
    </label>
  );
}

export { FilePicker };
