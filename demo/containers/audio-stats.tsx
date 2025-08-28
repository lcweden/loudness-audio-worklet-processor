import { createMemo, For, Show } from "solid-js";
import { createLoudness } from "../hooks";
import { formatChannels, formatFileSize, formatSampleRate } from "../utils";

function AudioStats() {
  const { start, getFile, getAudioBuffer, getIsProcessing, getIsFinished, getSnapshot, getError } = createLoudness();
  const getPercentage = createMemo<number>(handlePercentageChange);
  const getState = createMemo<"READY" | "PROCESSING" | "FINISHED">(handleStateChange);

  function handlePercentageChange() {
    const buffer = getAudioBuffer();
    const snapshot = getSnapshot();

    if (!buffer || !snapshot) return 0;

    return Math.ceil((snapshot.currentTime / buffer.duration) * 100);
  }

  function handleStateChange() {
    if (getIsProcessing()) return "PROCESSING";
    if (getIsFinished()) return "FINISHED";

    return "READY";
  }

  return (
    <Show when={getFile()} keyed={true}>
      {(file) => (
        <div class="card bg-base-200 shadow-sm">
          <div class="card-body">
            <div class="flex flex-col gap-1">
              <p class="truncate text-lg tracking-wider">{file.name}</p>
              <div class="flex items-center gap-2">
                <span class="badge badge-sm badge-neutral badge-soft">{file.type}</span>
                <p class="text-base-content/60 text-sm">{formatFileSize(file.size)}</p>
              </div>
            </div>

            <Show
              when={getError()}
              keyed={true}
              fallback={
                <>
                  <div class="mt-8 flex flex-col items-center justify-center gap-2">
                    <div
                      class="badge badge-sm"
                      classList={{
                        "badge-info": getState() === "READY",
                        "badge-warning": getState() === "PROCESSING",
                        "badge-success": getState() === "FINISHED"
                      }}
                    >
                      {getState()}
                    </div>
                    <progress
                      class="progress outline-base-300 text-base-content/30 w-full bg-transparent outline outline-offset-1"
                      value={getPercentage()}
                      max="100"
                    />
                  </div>

                  <Show when={getAudioBuffer()} keyed={true}>
                    {(buffer) => (
                      <div class="mt-8 grid grid-cols-4 text-center">
                        <For
                          each={[
                            `${buffer.duration.toFixed(1)} s`,
                            buffer.length,
                            formatSampleRate(buffer.sampleRate),
                            formatChannels(buffer.numberOfChannels)
                          ]}
                        >
                          {(value, index) => (
                            <div class="space-y-0.5">
                              <p class="text-base-content/60 text-xs">
                                {["Duration", "Length", "Sample Rate", "Channel"][index()]}
                              </p>
                              <p class="text-xs">{value}</p>
                            </div>
                          )}
                        </For>
                      </div>
                    )}
                  </Show>

                  <div class="mt-6">
                    <button class="btn btn-block btn-primary" disabled={getIsProcessing()} onclick={start}>
                      {getState() === "PROCESSING" ? <span class="loading loading-spinner loading-sm" /> : "Start"}
                    </button>
                  </div>
                </>
              }
            >
              {(error) => <p class="text-error mt-2 text-xs">{error.message}</p>}
            </Show>
          </div>
        </div>
      )}
    </Show>
  );
}

export { AudioStats };
