import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import type { Metrics } from './type';

/**
 * A class that implements the loudness algorithm as specified in ITU-R, EBU.
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class _ extends AudioWorkletProcessor {
  static FRAME_SIZE = 128;

  static K_WEIGHTING_BIQUAD_COEFFICIENTS = {
    highshelf: {
      a: [-1.69065929318241, 0.73248077421585],
      b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
    },
    highpass: {
      a: [-1.99004745483398, 0.99007225036621],
      b: [1.0, -2.0, 1.0],
    },
  };

  static CHANNEL_WEIGHT_FACTORS = [1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0];

  biquadraticFilters: [BiquadraticFilter, BiquadraticFilter][][] = [];
  blocks: number[] = [];
  circularBuffers: [CircularBuffer<number>, CircularBuffer<number>][] = [];
  currentMetrics: Metrics[] = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const numberOfInputs = inputs.length;
    const numberOfChannels = inputs[0]?.length || 0;
    const numberOfSamples = inputs[0]?.[0]?.length || 0;

    if (numberOfInputs === 0 || numberOfChannels === 0 || numberOfSamples === 0) {
      return true;
    }

    for (let i = 0; i < numberOfInputs; i++) {
      if (!this.biquadraticFilters[i]) {
        this.biquadraticFilters[i] = [];
      }

      if (!this.circularBuffers[i]) {
        this.circularBuffers[i] = [
          new CircularBuffer((sampleRate * 0.4) / _.FRAME_SIZE),
          new CircularBuffer((sampleRate * 3.0) / _.FRAME_SIZE),
        ];
      }

      if (!this.currentMetrics[i]) {
        this.currentMetrics[i] = {
          integratedLoudness: Number.NEGATIVE_INFINITY,
          shortTermLoudness: Number.NEGATIVE_INFINITY,
          momentaryLoudness: Number.NEGATIVE_INFINITY,
          loudnessRange: Number.NEGATIVE_INFINITY,
          truePeakLevel: Number.NEGATIVE_INFINITY,
          maximumMomentaryLoudness: Number.NEGATIVE_INFINITY,
          maximumShortTermLoudness: Number.NEGATIVE_INFINITY,
          maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
          programLoudness: Number.NEGATIVE_INFINITY,
          targetLoudness: Number.NEGATIVE_INFINITY,
          loudnessDeviation: Number.NEGATIVE_INFINITY,
          samplePeak: Number.NEGATIVE_INFINITY,
          dynamicRange: Number.NEGATIVE_INFINITY,
        };
      }

      for (let j = 0; j < numberOfSamples; j++) {
        let channelWeightedSampleSum = 0;

        for (let k = 0; k < numberOfChannels; k++) {
          if (!this.biquadraticFilters[i][k]) {
            const { highshelf, highpass } = _.K_WEIGHTING_BIQUAD_COEFFICIENTS;

            this.biquadraticFilters[i][k] = [
              new BiquadraticFilter(highshelf.a, highshelf.b),
              new BiquadraticFilter(highpass.a, highpass.b),
            ];
          }

          const sample = inputs[i][k][j];
          const [highshelf, highpass] = this.biquadraticFilters[i][k];
          const highshelfOutput = highshelf.process(sample);
          const highpassOutput = highpass.process(highshelfOutput);
          const kWeightedSample = highpassOutput;
          const squaredSample = kWeightedSample * kWeightedSample;
          const channelWeightedSample = squaredSample * (_.CHANNEL_WEIGHT_FACTORS[k] ?? 1.0);

          channelWeightedSampleSum += channelWeightedSample;

          outputs[i][k].set(inputs[i][k]);
        }

        for (const buffer of this.circularBuffers[i]) {
          buffer.push(channelWeightedSampleSum);
        }
      }
    }

    for (let i = 0; i < this.circularBuffers.length; i++) {
      const [momentaryBuffer, shortTermBuffer] = this.circularBuffers[i];
      const isMomentaryReady = currentFrame % (((sampleRate * 0.4) / 128) * 0.1 * 128) === 0;
      const isShortTermReady = currentFrame % (((sampleRate * 3.0) / 128) * 0.1 * 128) === 0;
      const energyToLkfs = (energy: number) => -0.691 + 10 * Math.log10(energy + Number.EPSILON);

      if (momentaryBuffer.isFull() && isMomentaryReady) {
        const samples = momentaryBuffer.slice();
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const lkfs = energyToLkfs(mean);

        this.currentMetrics[i].momentaryLoudness = lkfs;
      }

      if (shortTermBuffer.isFull() && isShortTermReady) {
        const samples = shortTermBuffer.slice();
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const lkfs = energyToLkfs(mean);

        this.currentMetrics[i].shortTermLoudness = lkfs;
      }
    }

    this.port.postMessage(this.currentMetrics);

    return true;
  }
}

export { _ as LoudnessProcessor };
export type { Metrics };
