/// <reference types="vite/client" />

interface AudioWorkletProcessorOptions {
  numberOfInputs: number;
  numberOfOutputs: number;
  outputChannelCount: number[][];
  processorOptions?: any;
}

declare const sampleRate: number;
declare const currentTime: number;
declare const currentFrame: number;

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options: AudioWorkletProcessorOptions);
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare function registerProcessor(name: string, processorCtor: typeof AudioWorkletProcessor): void;
