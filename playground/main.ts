/**
 * EBU Loudness test set
 */
const mideaUrls: Map<number, string> = new Map([
  [20, "1kHz Sine -20 LUFS-16bit.wav"],
  [26, "1kHz Sine -26 LUFS-16bit.wav"],
  [40, "1kHz Sine -40 LUFS-16bit.wav"],
]);
const moduleUrl = new URL("../lib/index.ts", import.meta.url);
const audioContext = new AudioContext({ sampleRate: 48000 });

const playButton = document.getElementById("play") as HTMLButtonElement;

playButton.addEventListener("click", async () => {
  await audioContext.audioWorklet.addModule(moduleUrl);
  const response = await fetch(mideaUrls.get(20) as string);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await audioContext.decodeAudioData(arrayBuffer);
  const source = new AudioBufferSourceNode(audioContext, { buffer });
  const loudness = new AudioWorkletNode(audioContext, "loudness");

  source.connect(loudness);
  source.start();

  loudness.port.onmessage = (event) => {
    console.log(event.data[0]);
  };

  source.onended = () => {
    loudness.disconnect();
    loudness.port.close();
  };
});
