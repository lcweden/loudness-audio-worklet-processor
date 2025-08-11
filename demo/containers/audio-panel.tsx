import { createEffect, createSignal, Show } from "solid-js";
import { DrawerToggle, FilePicker, Menu, Navbar } from "../components";
import { MinusCircleIcon, XMarkIcon } from "../icons";
import { AudioStats } from "./audio-stats";

type AudioPanelProps = {};

function AudioPanel(_: AudioPanelProps) {
  const [getFileList, setFileList] = createSignal<FileList>();
  const [getFile, setFile] = createSignal<File>();

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const fileList = target.files;

    document.startViewTransition(() => {
      setFileList(fileList || undefined);
    });
  }

  createEffect(() => {
    const files = getFileList();

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
            <div role="alert" class="alert alert-vertical">
              <MinusCircleIcon stroke-width={1.5} class="text-info size-6" />
              <div>
                <h3 class="font-bold">Lorem ipsum dolor</h3>
                <div class="text-xs tracking-wide">Lorem ipsum dolor sit amet consectetur adipiscing elit</div>
              </div>
              <FilePicker
                class="btn btn-sm btn-primary"
                accept="audio/*,video/*"
                multiple
                onchange={handleFileChange}
              />
            </div>
          }
        >
          <AudioStats getFile={getFile} />
        </Show>
      </div>

      <Menu<File> iterable={getFileList()} title="Lorem ipsum dolor sit amet." class="w-full">
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
