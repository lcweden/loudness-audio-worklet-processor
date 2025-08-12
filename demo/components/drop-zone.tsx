import { Component, JSX, splitProps } from "solid-js";
import { matchesAcceptedMimeType } from "../utils";
import { FilePicker } from "./file-picker";

type DropZone = Component<
  {
    children?: JSX.Element;
    onfiles?: (files: Array<File>) => void;
  } & JSX.InputHTMLAttributes<HTMLInputElement>
>;

const DropZone: DropZone = (props) => {
  const [local, others] = splitProps(props, ["children", "onfiles"]);

  const handleDragover: JSX.EventHandler<HTMLDivElement, DragEvent> = (event) => {
    event.preventDefault();
  };

  const handleDrop: JSX.EventHandler<HTMLDivElement, DragEvent> = async (event) => {
    event.preventDefault();
    const files = event.dataTransfer?.files;

    if (!files) return;

    local.onfiles?.(Array.from(files).filter((file) => matchesAcceptedMimeType(others.accept || "", file)));
  };

  const handleChange: JSX.EventHandler<HTMLInputElement, Event> = (event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    if (!files) return;

    local.onfiles?.(Array.from(files));
  };

  return (
    <div ondragover={handleDragover} ondrop={handleDrop}>
      <FilePicker
        {...others}
        class="border-base-200 hover:border-base-300 hover:bg-base-200 bg-base-100 flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed"
        onchange={handleChange}
      >
        {local.children}
      </FilePicker>
    </div>
  );
};

export { DropZone };
