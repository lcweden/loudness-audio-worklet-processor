import { Accessor, createEffect, createMemo, createSignal, Show } from "solid-js";
import { createLoudnessMeter } from "../hooks";
import { formatChannels, formatFileSize, formatSampleRate } from "../utils";

type AudioStatsProps = {
  getFile: Accessor<File | undefined>;
};

function AudioStats(props: AudioStatsProps) {
  const { start, reset, getIsProcessing, getIsFinished, getSnapshots } = createLoudnessMeter();
  const [getAudioBuffer, setAudioBuffer] = createSignal<AudioBuffer>();
  const getPercentage = createMemo<number>(handlePercentageChange);
  const getState = createMemo<"READY" | "PROCESSING" | "FINISHED">(handleStateChange);

  function handlePercentageChange() {
    const buffer = getAudioBuffer();
    const snapshot = getSnapshots().at(-1);

    if (!buffer || !snapshot) return 0;

    return Math.ceil((snapshot.currentTime / buffer.duration) * 100);
  }

  function handleStateChange() {
    if (getIsProcessing()) return "PROCESSING";
    if (getIsFinished()) return "FINISHED";
    return "READY";
  }

  function handleMeasurementStart() {
    const buffer = getAudioBuffer();
    if (buffer) start(buffer);
  }

  createEffect(() => {
    const file = props.getFile();

    if (file) {
      document.startViewTransition(async () => {
        const arrayBuffer = await file!.arrayBuffer();
        const audioBuffer = await new AudioContext().decodeAudioData(arrayBuffer);
        setAudioBuffer(audioBuffer);
        reset();
      });
    }
  });

  return (
    <Show
      when={getAudioBuffer()}
      keyed
      fallback={
        <div class="flex w-full items-center justify-center p-8">
          <span class="loading loading-xl"></span>
        </div>
      }
    >
      {(audioBuffer) => {
        return (
          <Show when={props.getFile()} keyed>
            {(file) => {
              const { name, size } = file;
              const { duration, length, sampleRate, numberOfChannels } = audioBuffer;

              return (
                <div class="rounded-box bg-base-200 border-base-300 space-y-8 border p-4 shadow">
                  <div>
                    <p class="text-md truncate tracking-wider">{name}</p>
                    <p class="text-base-content/60 text-xs">{formatFileSize(size)}</p>
                  </div>

                  <div class="flex flex-col items-center justify-center gap-2">
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
                      class="progress outline-base-300 w-full bg-transparent outline outline-offset-1"
                      value={getPercentage()}
                      max="100"
                    />
                  </div>

                  <div class="grid grid-cols-4 text-center">
                    {[
                      `${duration.toFixed(1)} s`,
                      length,
                      formatSampleRate(sampleRate),
                      formatChannels(numberOfChannels)
                    ].map((value, index) => (
                      <div class="space-y-0.5">
                        <p class="text-base-content/60 text-xs">
                          {["Duration", "Length", "Sample Rate", "Channel"][index]}
                        </p>
                        <p class="text-xs">{value}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    class="btn btn-block btn-primary btn-sm"
                    disabled={getIsProcessing()}
                    onclick={handleMeasurementStart}
                  >
                    {getState() === "PROCESSING" ? <span class="loading loading-spinner loading-sm" /> : "Start"}
                  </button>
                </div>
              );
            }}
          </Show>
        );
      }}
    </Show>
  );
}

export { AudioStats };
