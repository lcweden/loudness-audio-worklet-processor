import { JSX, splitProps } from "solid-js";
import { matchesAcceptedMimeType } from "../utils";
import { FilePicker } from "./file-picker";

type DropZoneProps = {
  children?: JSX.Element;
  onfiles?: (files: Array<File>) => void;
} & JSX.InputHTMLAttributes<HTMLInputElement>;

function DropZone(props: DropZoneProps) {
  const [local, others] = splitProps(props, ["children", "onfiles"]);

  function handleDragover(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;

    if (!files) return;

    local.onfiles?.(Array.from(files).filter((file) => matchesAcceptedMimeType(others.accept || "", file)));
  }

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files) return;

    local.onfiles?.(Array.from(files));
  }

  return (
    <div ondragover={handleDragover} ondrop={handleDrop}>
      <FilePicker
        {...others}
        class="border-base-300 hover:border-base-300 hover:bg-base-200 bg-base-100 flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed"
        onchange={handleChange}
      >
        {local.children}
      </FilePicker>
    </div>
  );
}

export { DropZone };
