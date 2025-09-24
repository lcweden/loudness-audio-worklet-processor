import { createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";
import { AudioLoudnessSnapshot } from "../types";

function Playground() {
  const [getAudioBuffer, setAudioBuffer] = createSignal<AudioBuffer>();
  const [getSnapshot, setSnapshot] = createSignal<AudioLoudnessSnapshot>();
  const [getError, setError] = createSignal<Error>();

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files || [];
    const file = files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    reader.onload = handleFileLoad;
  }

  function handleFileLoad(event: ProgressEvent<FileReader>) {
    const reader = event.target as FileReader;
    const arrayBuffer = reader.result as ArrayBuffer;
    new AudioContext().decodeAudioData(arrayBuffer).then(setAudioBuffer).catch(setError);
  }

  function handleAudioWorkletMessage(event: MessageEvent<AudioLoudnessSnapshot>) {
    setSnapshot(event.data);
  }

  createEffect(() => {
    const audioBuffer = getAudioBuffer();

    if (!audioBuffer) return;

    const { length, sampleRate, numberOfChannels } = audioBuffer;
    const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);
    const module = new URL("../src/index.ts", import.meta.url);
    context.audioWorklet
      .addModule(module)
      .then(() => {
        const source = new AudioBufferSourceNode(context, { buffer: audioBuffer });
        const worklet = new AudioWorkletNode(context, "loudness-processor", {
          outputChannelCount: [numberOfChannels],
          processorOptions: {
            capacity: length / sampleRate,
            interval: 0.1
          }
        });

        worklet.port.onmessage = handleAudioWorkletMessage;

        source.connect(worklet).connect(context.destination);
        source.start();

        console.time("1");
        context.startRendering().then(() => console.timeEnd("1"));
      })
      .catch(setError);
  });

  return (
    <main>
      <h1>Playground</h1>
      <section>
        <h2>Select An Audio Or Video File</h2>
        <input type="file" onchange={handleFileChange} />
        <p>{getError()?.message}</p>
      </section>
      <section>
        <h2>Loudness Measurement</h2>
        <dl>
          <dt>Momentary Loudness (LUFS)</dt>
          <dd>{getSnapshot()?.currentMetrics[0].momentaryLoudness.toFixed(1) ?? "-"}</dd>
          <dt>Short-Term Loudness (LUFS)</dt>
          <dd>{getSnapshot()?.currentMetrics[0].shortTermLoudness.toFixed(1) ?? "-"}</dd>
          <dt>Integrated Loudness (LUFS)</dt>
          <dd>{getSnapshot()?.currentMetrics[0].integratedLoudness.toFixed(1) ?? "-"}</dd>
          <dt>Loudness Range (LRA)</dt>
          <dd>{getSnapshot()?.currentMetrics[0].loudnessRange.toFixed(1) ?? "-"}</dd>
          <dt>Maximum True Peak Level (dBTP)</dt>
          <dd>{getSnapshot()?.currentMetrics[0].maximumTruePeakLevel.toFixed(1) ?? "-"}</dd>
        </dl>
        <details open>
          <summary>Raw Data</summary>
          <pre>{JSON.stringify(getSnapshot(), null, 2)}</pre>
        </details>
      </section>
      <section>
        <h2>ITU-R BS.1770-5 Reference</h2>
        <ul>
          <li>
            <strong>LUFS</strong>: Loudness Units relative to Full Scale, standardized loudness measure.
          </li>
          <li>
            <strong>Momentary</strong>: 400ms sliding window loudness.
          </li>
          <li>
            <strong>Short-Term</strong>: 3s sliding window loudness.
          </li>
          <li>
            <strong>Integrated</strong>: Overall loudness over the program.
          </li>
          <li>
            <strong>Loudness Range</strong>: Statistical measure of loudness variation.
          </li>
          <li>
            <strong>True Peak</strong>: Maximum sample-accurate peak, considering inter-sample peaks.
          </li>
        </ul>
        <p>
          <a href="https://www.itu.int/rec/R-REC-BS.1770/en" target="_blank" rel="noopener">
            ITU-R BS.1770-5 Official Recommendation
          </a>
        </p>
      </section>
      <section>
        <h2>ITU-R BS.2217 Reference</h2>
        <p>
          This Report contains a table of compliance test files and related information for verifying that a meter meets
          the specifications within Recommendation ITU-R BS.1770.
        </p>
        <p>
          <a href="https://www.itu.int/pub/R-REP-BS.2217" target="_blank" rel="noopener">
            Compliance material for Recommendation ITU-R BS.1770
          </a>
        </p>
      </section>
    </main>
  );
}

render(() => <Playground />, document.getElementById("root")!);
