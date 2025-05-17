import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { AudioLoudnessSnapshot } from '../types';

const audioWorkletModuleUrl = new URL('../src/index.ts', import.meta.url);

function App() {
  const [getFile, setFile] = createSignal<File>();
  const [getObjectUrl, setObjectUrl] = createSignal<string>();
  const [getSnapshot, setSnapshot] = createSignal<AudioLoudnessSnapshot>();
  const [getSnapshots, setSnapshots] = createSignal<AudioLoudnessSnapshot[]>();
  let audioContext: AudioContext;

  function handleFileSelect(event: Event) {
    const files = (event.target as HTMLInputElement).files;
    const file = files?.[0];

    if (!file) {
      return;
    }

    setFile(file);
    setObjectUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }

      return URL.createObjectURL(file);
    });
  }

  createEffect(() => {
    const file = getFile();

    if (!file || !audioContext) {
      return;
    }

    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const { numberOfChannels, length, sampleRate } = audioBuffer;
        const offlineAudioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

        await offlineAudioContext.audioWorklet.addModule(audioWorkletModuleUrl);

        const source = new AudioBufferSourceNode(offlineAudioContext, { buffer: audioBuffer });
        const worklet = new AudioWorkletNode(offlineAudioContext, 'loudness-processor');

        source.connect(worklet);
        source.start();
        worklet.connect(offlineAudioContext.destination);
        worklet.port.onmessage = (event: MessageEvent<AudioLoudnessSnapshot>) => {
          setSnapshot(event.data);
          setSnapshots((prev) => [...(prev || []), event.data]);
        };

        await offlineAudioContext.startRendering();
      } catch (error) {
        console.error(error);
      }
    })();
  });

  onMount(() => {
    audioContext = new AudioContext({ sampleRate: 48000 });
  });

  onCleanup(() => {
    const objectUrl = getObjectUrl();

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    if (audioContext) {
      audioContext.close();
    }
  });

  return (
    <div class="bg-base-200 flex h-dvh w-dvw justify-center select-none">
      <div class="bg-base-100 sm:rounded-box container flex flex-1 flex-col gap-4 sm:m-4 sm:shadow-xl">
        <nav class="flex items-center justify-between p-4">
          <div class="flex items-center gap-1">
            <label class="btn btn-sm btn-square btn-primary">
              +
              <input type="file" accept="audio/*" class="hidden" onChange={handleFileSelect} />
            </label>

            <p class="text-base-content sm:text-md font-mono text-sm font-light">Loudness Meter</p>
          </div>
          <div class="">
            <a class="btn btn-sm btn-btn-wide btn-primary">GitHub</a>
          </div>
        </nav>
        <main class="flex flex-1 flex-col overflow-y-scroll p-4">
          <div class="stats stats-vertical lg:stats-horizontal shadow">
            <div class="stat bg-base-200 place-items-center">
              <div class="stat-title">Integrated Loudness</div>
              <div class="stat-value select-text">
                {(() => {
                  const snapshot = getSnapshot();
                  const integratedLoudness = snapshot?.currentMetrics[0].integratedLoudness;
                  return integratedLoudness ? integratedLoudness.toFixed(1) : '-';
                })()}
              </div>
              <div class="stat-desc">LUFS</div>
            </div>

            <div class="stat bg-base-200 place-items-center">
              <div class="stat-title">Loudness Range</div>
              <div class="stat-value select-text">
                {(() => {
                  const snapshot = getSnapshot();
                  const loudnessRange = snapshot?.currentMetrics[0].loudnessRange;
                  return loudnessRange ? loudnessRange.toFixed(1) : '-';
                })()}
              </div>
              <div class="stat-desc">LRA</div>
            </div>

            <div class="stat bg-base-200 place-items-center">
              <div class="stat-title">True Peak</div>
              <div class="stat-value select-text">
                {(() => {
                  const snapshot = getSnapshot();
                  const maximumTruePeakLevel = snapshot?.currentMetrics[0].maximumTruePeakLevel;
                  return maximumTruePeakLevel ? maximumTruePeakLevel.toFixed(1) : '-';
                })()}
              </div>
              <div class="stat-desc">dBTP</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export { App };
