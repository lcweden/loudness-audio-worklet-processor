import { JSXElement } from 'solid-js';
import { render } from 'solid-js/web';
import { LoudnessProcessorData } from '../types';
import './index.css';

const root = document.getElementById('root');

const app = (): JSXElement => {
  const audioContext = new AudioContext({ sampleRate: 48000 });

  async function handleFileChange(event: Event) {
    const files = (event.target as HTMLInputElement).files ?? [];
    const file = files[0];

    if (!file) {
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const { numberOfChannels, length, sampleRate } = audioBuffer;
    const offlineAudioBuffer = new OfflineAudioContext(numberOfChannels, length, sampleRate);
    const moduleUrl = new URL('../src/index.ts', import.meta.url);

    await offlineAudioBuffer.audioWorklet.addModule(moduleUrl);

    const sourceNode = new AudioBufferSourceNode(offlineAudioBuffer, { buffer: audioBuffer });
    const workletNode = new AudioWorkletNode(offlineAudioBuffer, 'loudness-processor');

    sourceNode.connect(workletNode).connect(offlineAudioBuffer.destination);
    sourceNode.start();

    workletNode.port.onmessage = (event: MessageEvent<LoudnessProcessorData>) => {
      console.log(event.data);
    };

    await offlineAudioBuffer.startRendering();
  }

  return (
    <main>
      <input class="file-input" type="file" onChange={handleFileChange} />
    </main>
  );
};

render(() => app(), root!);
