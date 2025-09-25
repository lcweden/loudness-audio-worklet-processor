import source from "../public/loudness.worklet.js?raw";

const module = URL.createObjectURL(new Blob([source], { type: "application/javascript" }));
const name = "loudness-processor";

class LoudnessWorkletNode extends AudioWorkletNode {
  constructor(context: BaseAudioContext, options?: AudioWorkletNodeOptions) {
    super(context, name, options);
  }

  static async loadModule(context: BaseAudioContext): Promise<void> {
    return await context.audioWorklet.addModule(module);
  }
}

async function createLoudnessWorklet(
  context: BaseAudioContext,
  options?: AudioWorkletNodeOptions
): Promise<AudioWorkletNode> {
  await context.audioWorklet.addModule(module);
  return new AudioWorkletNode(context, name, options);
}

export { createLoudnessWorklet, LoudnessWorkletNode };
