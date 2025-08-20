import { createEffect, createSignal, on, Show } from "solid-js";
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

  function handleFileClear(_: MouseEvent) {
    document.startViewTransition(() => {
      setFiles([]);
    });
  }

  createEffect(
    on(getFiles, (files) => {
      document.startViewTransition(() => {
        if (files) {
          setFile(files[0]);
        } else {
          setFile(undefined);
        }
      });
    })
  );

  return (
    <aside class="bg-base-100 rounded-r-box border-base-300 min-h-full w-86 border-r shadow">
      <Navbar
        class="from-base-100 via-base-100 rounded-t-box sticky top-0 z-10 bg-gradient-to-b via-80% to-transparent"
        start={
          <div class="flex items-center gap-1">
            <DrawerToggle class="btn btn-square btn-sm">
              <XMarkIcon />
            </DrawerToggle>
            <a class="btn btn-ghost hidden sm:flex" href="/">
              Loudness Meter
            </a>
          </div>
        }
      />

      <div class="p-2">
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
                <p class="text-base-content/70 text-xs font-thin">All processing is done locally in your browser</p>
              </div>
            </DropZone>
          }
        >
          <AudioStats getFile={getFile} />
        </Show>
      </div>

      <Menu<File>
        class="w-full"
        iterable={getFiles()}
        title={
          <li class="text-base-content/60 flex flex-row items-center justify-between py-2 pl-4 text-xs tracking-wide">
            Selected Files
            <button class="btn btn-xs btn-ghost" onclick={handleFileClear}>
              Clear
            </button>
          </li>
        }
        fallback={
          <div role="alert" class="alert p-2">
            <button class="btn btn-square btn-sm btn-warning">
              <MinusCircleIcon stroke-width={1.5} />
            </button>
            <div>
              <h3 class="text-xs font-bold">Your playlist is empty!</h3>
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
