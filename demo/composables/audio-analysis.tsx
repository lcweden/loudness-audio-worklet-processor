import { createSignal, onCleanup, onMount } from 'solid-js';

const mode = import.meta.env.MODE as 'development' | 'production';
const audioWorkletUrl = mode === 'production' ? 'loudness.worklet.js' : new URL('../../src/index.ts', import.meta.url);

function createAudioAnalysis<T>(callback: (event: MessageEvent<T>) => void) {
  const [getBuffer, setBuffer] = createSignal<AudioBuffer>();
  let audioContext: AudioContext;

  async function process(file: File, onended?: (this: AudioScheduledSourceNode, ev: Event) => any): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      setBuffer(audioBuffer);

      const { numberOfChannels, length, sampleRate } = audioBuffer;
      const offlineAudioContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

      await offlineAudioContext.audioWorklet.addModule(audioWorkletUrl);

      const source = new AudioBufferSourceNode(offlineAudioContext, { buffer: audioBuffer });
      const worklet = new AudioWorkletNode(offlineAudioContext, 'loudness-processor');

      source.connect(worklet);
      source.start();
      source.onended = onended ? onended : null;

      worklet.connect(offlineAudioContext.destination);
      worklet.port.onmessage = callback;

      await offlineAudioContext.startRendering();
    } catch (error) {
      throw new Error('Audio analysis failed.', { cause: error });
    }
  }

  onMount(() => {
    audioContext = new AudioContext({ sampleRate: 48000 });
  });

  onCleanup(() => {
    if (audioContext) {
      audioContext.close();
    }
  });

  return { getBuffer, process };
}

export { createAudioAnalysis };
