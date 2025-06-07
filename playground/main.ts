import { AudioLoudnessSnapshot } from '../types';

const audioContext = new AudioContext({ sampleRate: 48000 });

const input = document.getElementsByTagName('input')[0];
const fileInfo = document.getElementById('file-info')!;
const momentary = document.getElementById('momentary')!;
const shortterm = document.getElementById('shortterm')!;
const integrated = document.getElementById('integrated')!;
const range = document.getElementById('range')!;
const truepeak = document.getElementById('truepeak')!;
const snapshot = document.getElementById('snapshot')!;

function metricsArrayToText(metrics: { [key: string]: number }[], key: keyof (typeof metrics)[0], unit = ''): string {
  return metrics
    .map((m, i) => (typeof m[key] === 'number' ? `CH ${i + 1}: ${m[key]?.toFixed(2)}${unit}` : `CH${i + 1}: -`))
    .join(', ');
}

input.addEventListener('change', async (event) => {
  const files = (event.target as HTMLInputElement).files ?? [];
  const file = files[0];

  if (!file) {
    fileInfo.textContent = '';
    return;
  }

  fileInfo.textContent = `Loaded: ${file.name} (${Math.round(file.size / 1024)} KB)`;
  momentary.textContent = '-';
  shortterm.textContent = '-';
  integrated.textContent = '-';
  range.textContent = '-';
  truepeak.textContent = '-';
  snapshot.textContent = '';

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
    const data = event.data;

    if (!Array.isArray(data.currentMetrics)) {
      return;
    }

    console.log(data);

    momentary.textContent = metricsArrayToText(data.currentMetrics, 'momentaryLoudness', ' LUFS');
    shortterm.textContent = metricsArrayToText(data.currentMetrics, 'shortTermLoudness', ' LUFS');
    integrated.textContent = metricsArrayToText(data.currentMetrics, 'integratedLoudness', ' LUFS');
    range.textContent = metricsArrayToText(data.currentMetrics, 'loudnessRange', ' LRA');
    truepeak.textContent = metricsArrayToText(data.currentMetrics, 'maximumTruePeakLevel', ' dBTP');
    snapshot.textContent = JSON.stringify(data, null, 2);
  };

  await offlineAudioBuffer.startRendering();
});
