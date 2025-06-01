import { createUniqueId, mergeProps } from 'solid-js';

type FileSelectorProps = {
  onSelect: (file: File) => void;
  onCleanUp?: () => void;
  class: string;
};

function FileSelector(fileSelectorProps: FileSelectorProps) {
  const props = mergeProps(fileSelectorProps);

  function handleClick(_: Event) {
    props?.onCleanUp?.();
  }

  function handleChange(event: Event) {
    const files = (event.target as HTMLInputElement).files;

    if (!files || !files.length) {
      return;
    }

    const file = files[0];

    if (!file) {
      return;
    }

    props.onSelect(file);
  }

  return (
    <label class={props.class}>
      <p>
        <span>Select File</span>
      </p>
      <input
        id={createUniqueId()}
        type="file"
        accept="*"
        class="hidden"
        onClick={handleClick}
        onChange={handleChange}
      />
    </label>
  );
}

export { FileSelector };
