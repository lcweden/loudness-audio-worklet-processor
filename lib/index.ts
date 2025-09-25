import source from "../public/loudness.worklet.js?raw";

interface LoudnessWorkletProcessorOptions {
  numberOfInputs?: AudioWorkletNodeOptions["numberOfInputs"];
  numberOfOutputs?: AudioWorkletNodeOptions["numberOfOutputs"];
  outputChannelCount?: AudioWorkletNodeOptions["outputChannelCount"];
  processorOptions?: {
    interval?: number;
    capacity?: number;
  };
}

const name = "loudness-processor";

class LoudnessWorkletNode extends AudioWorkletNode {
  constructor(context: BaseAudioContext, options?: LoudnessWorkletProcessorOptions) {
    super(context, name, options);
  }

  static async loadModule(context: BaseAudioContext): Promise<void> {
    return addModule(context);
  }
}

async function createLoudnessWorklet(
  context: BaseAudioContext,
  options?: LoudnessWorkletProcessorOptions
): Promise<AudioWorkletNode> {
  await addModule(context);
  return new AudioWorkletNode(context, name, options);
}

async function addModule(context: BaseAudioContext): Promise<void> {
  const blob = new Blob([source], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  try {
    await context.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export { createLoudnessWorklet, LoudnessWorkletNode };
