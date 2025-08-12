import { createEffect, createSignal, Show } from "solid-js";
import { DrawerToggle, DropZone, Menu, Navbar } from "../components";
import { DocumentPlusIcon, MinusCircleIcon, XMarkIcon } from "../icons";
import { AudioStats } from "./audio-stats";

type AudioPanelProps = {};

function AudioPanel(_: AudioPanelProps) {
  const [getFiles, setFiles] = createSignal<Array<File>>();
  const [getFile, setFile] = createSignal<File>();

  function handleFiles(files: Array<File>) {
    document.startViewTransition(() => {
      setFiles(files || undefined);
    });
  }

  createEffect(() => {
    const files = getFiles();

    if (files) {
      document.startViewTransition(() => {
        setFile(files[0]);
      });
    }
  });

  return (
    <aside class="bg-base-100 min-h-full w-86 shadow">
      <Navbar
        class="from-base-100 via-base-100 sticky top-0 z-10 bg-gradient-to-b via-80% to-transparent"
        start={
          <div class="flex items-center gap-1">
            <DrawerToggle class="btn btn-square">
              <XMarkIcon />
            </DrawerToggle>
            <button class="btn btn-ghost">Loudness Meter</button>
          </div>
        }
      />

      <div class="px-2">
        <Show
          when={getFile()}
          fallback={
            <DropZone accept="audio/*,video/*" multiple onfiles={handleFiles}>
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <DocumentPlusIcon class="mb-4 size-8" />
                <p class="mb-2 text-sm">
                  <span class="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p class="mb-2 text-xs">Audio or Video Files</p>
                <p class="text-base-content/50 text-xs font-thin">All processing is done locally in your browser</p>
              </div>
            </DropZone>
          }
        >
          <AudioStats getFile={getFile} />
        </Show>
      </div>

      <Menu<File>
        iterable={getFiles()}
        title="Selected files"
        class="w-full"
        fallback={
          <div role="alert" class="alert p-2">
            <button class="btn btn-square btn-sm btn-warning">
              <MinusCircleIcon />
            </button>
            <div>
              <h3 class="font-bold">Your playlist is empty!</h3>
              <div class="text-xs">Drop or select files to begin.</div>
            </div>
          </div>
        }
      >
        {(item) => (
          <button classList={{ "menu-active": item.name === getFile()?.name }} onclick={() => setFile(item)}>
            <span class="block truncate text-left">{item.name}</span>
          </button>
        )}
      </Menu>
    </aside>
  );
}

export { AudioPanel };
