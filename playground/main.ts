import { AudioLoudnessSnapshot } from '../types';

const audioContext = new AudioContext({ sampleRate: 48000 });

const input = document.getElementsByTagName('input')[0];

input.addEventListener('change', async (event) => {
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

  workletNode.port.onmessage = (event: MessageEvent<AudioLoudnessSnapshot>) => {
    console.log(event.data);
  };

  await offlineAudioBuffer.startRendering();
});
