import { mergeProps } from 'solid-js';

type FileSelectorProps = {
  onSelect: (file: File) => void;
  onCleanUp: () => void;
};

function FileSelector(fileSelectorProps: FileSelectorProps) {
  const props = mergeProps(fileSelectorProps);

  function handleClick(_: Event) {
    props.onCleanUp();
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
    <label class="btn btn-sm btn-primary max-sm:btn-square">
      <p>
        <span class="max-sm:hidden">Select File</span>
      </p>
      <input type="file" accept="*" class="hidden" onClick={handleClick} onChange={handleChange} />
    </label>
  );
}

export { FileSelector };
