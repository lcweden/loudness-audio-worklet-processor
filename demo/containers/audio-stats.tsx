import { Accessor, createEffect, createSignal, Show } from "solid-js";
import { formatChannels, formatFileSize, formatSampleRate } from "../utils";

type AudioStatsProps = {
  getFile: Accessor<File | undefined>;
};

function AudioStats(props: AudioStatsProps) {
  const [getAudioBuffer, setAudioBuffer] = createSignal<AudioBuffer>();

  createEffect(() => {
    const file = props.getFile();

    if (file) {
      document.startViewTransition(async () => {
        const arrayBuffer = await file!.arrayBuffer();
        const audioBuffer = await new AudioContext().decodeAudioData(arrayBuffer);
        setAudioBuffer(audioBuffer);
      });
    }
  });

  return (
    <Show when={getAudioBuffer()} keyed fallback={<span class="loading loading-spinner loading-xl" />}>
      {(audioBuffer) => {
        return (
          <Show when={props.getFile()} keyed>
            {(file) => {
              const { name, size } = file;
              const { duration, length, sampleRate, numberOfChannels } = audioBuffer;

              return (
                <div class="border-neutral rounded-box space-y-8 border p-4">
                  <div>
                    <p class="text-md truncate tracking-wider">{name}</p>
                    <p class="text-base-content/60 text-xs">{formatFileSize(size)}</p>
                  </div>

                  <div class="flex flex-col items-center justify-center gap-2">
                    <div class="badge badge-soft badge-sm">Ready</div>
                    <progress
                      class="progress outline-base-300 w-full bg-transparent outline outline-offset-1"
                      value={0}
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
