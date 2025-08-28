import { JSX, splitProps } from "solid-js";

type FilePickerProps = {
  children?: JSX.Element;
  class?: string;
} & JSX.InputHTMLAttributes<HTMLInputElement>;

function FilePicker(props: FilePickerProps) {
  const [local, others] = splitProps(props, ["children", "class"]);

  return (
    <label class={local.class}>
      {local.children || "Select File"}
      <input {...others} type="file" class="hidden" />
    </label>
  );
}

export { FilePicker };
