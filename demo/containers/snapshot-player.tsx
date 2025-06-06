import { Accessor, createEffect, createSignal, Match, mergeProps, onCleanup, Show, Switch } from 'solid-js';
import { AudioLoudnessSnapshot } from '../../types';
import { createRange } from '../composables';
import { PlayIcon, StopIcon, XMarkIcon } from '../icons';

type SnapshotPlayerProps = {
  getFile: Accessor<File | undefined>;
  getSnapshots: Accessor<AudioLoudnessSnapshot[] | undefined>;
  getBuffer: Accessor<AudioBuffer | undefined>;
  snapshotSelectedRange: ReturnType<typeof createRange>;
};

function SnapshotPlayer(snapshotPlayerProps: SnapshotPlayerProps) {
  const { getFile, getSnapshots, getBuffer, snapshotSelectedRange } = mergeProps(snapshotPlayerProps);
  const [isPlaying, setIsPlaying] = createSignal(false);
  let audioContext: AudioContext | null = null;
  let bufferSourceNode: AudioBufferSourceNode | null = null;

  function stopPlayback() {
    if (bufferSourceNode) {
      bufferSourceNode.onended = null;
      bufferSourceNode.stop();
      bufferSourceNode.disconnect();
      bufferSourceNode = null;
    }

    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }

    setIsPlaying(false);
  }

  function handlePlay(_: Event) {
    if (isPlaying()) return;

    const buffer = getBuffer();
    const range = snapshotSelectedRange.getRange();
    const snapshots = getSnapshots();

    if (!range || !snapshots) {
      return;
    }

    const start = snapshots[range[0]];
    const end = snapshots[range[1]];
    audioContext = new AudioContext();
    bufferSourceNode = new AudioBufferSourceNode(audioContext, { buffer: buffer });
    bufferSourceNode.connect(audioContext.destination);
    bufferSourceNode.start(0, start.currentTime, end.currentTime - start.currentTime);
    bufferSourceNode.loop = false;
    bufferSourceNode.onended = () => {
      stopPlayback();
    };

    setIsPlaying(true);
  }

  createEffect(() => {
    const range = snapshotSelectedRange.getRange();

    if (!range) {
      stopPlayback();
    }
  });

  onCleanup(() => {
    stopPlayback();
  });

  return (
    <Show when={snapshotSelectedRange.getRange()} keyed>
      {(range) => (
        <div class="fixed bottom-16 left-1/2 z-20 -translate-x-1/2">
          <div class="bg-neutral/50 rounded-box w-88 space-y-2 p-1.5 backdrop-blur-md">
            <Show when={getFile()}>
              {(file) => {
                return (
                  <div class="bg-neutral/25 w-fit rounded-md p-1 px-3">
                    <div class="flex items-center gap-1.5">
                      <p class="text-neutral-content/75 max-w-56 truncate text-xs font-light tracking-wider">
                        {file().name}
                      </p>
                      <button
                        class="bg-neutral/50 text-neutral-content/30 hover:bg-neutral/60 cursor-pointer rounded-full p-0.5"
                        onclick={() => snapshotSelectedRange.clear()}
                      >
                        <XMarkIcon />
                      </button>
                    </div>
                  </div>
                );
              }}
            </Show>
            <div class="bg-neutral rounded-box flex items-center gap-2 p-1.5">
              <Switch>
                <Match when={isPlaying()}>
                  <button class="btn btn-square btn-sm" type="button" onclick={stopPlayback} disabled={!isPlaying()}>
                    <StopIcon />
                  </button>
                </Match>
                <Match when={!isPlaying()}>
                  <button class="btn btn-square btn-sm" type="button" onclick={handlePlay} disabled={isPlaying()}>
                    <PlayIcon />
                  </button>
                </Match>
              </Switch>

              <div class="text-neutral-content/75 flex w-full items-center justify-center gap-2 text-xl font-thin tabular-nums">
                <span>{range[0] + 1}</span>
                <span>:</span>
                <span>{range[1] + 1}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}

export { SnapshotPlayer };
