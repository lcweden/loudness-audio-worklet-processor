import { AudioLoudnessSnapshot } from "../../types";

class LoudnessService {
  module: URL;

  constructor(module: URL) {
    this.module = module;
  }

  async measure(
    audioBuffer: AudioBuffer,
    onmessage: (event: MessageEvent<AudioLoudnessSnapshot>) => void
  ): Promise<AudioBuffer> {
    const { numberOfChannels, length, sampleRate } = audioBuffer;
    const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);
    await context.audioWorklet.addModule(this.module);

    const source = new AudioBufferSourceNode(context, { buffer: audioBuffer });
    const worklet = new AudioWorkletNode(context, "loudness-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [numberOfChannels],
      processorOptions: {
        capacity: length / sampleRate,
        interval: 0.01
      }
    });

    worklet.port.onmessage = onmessage;

    source.connect(worklet).connect(context.destination);
    source.start();

    return await context.startRendering();
  }
}

export default LoudnessService;
