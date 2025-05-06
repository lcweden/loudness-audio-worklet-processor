import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import { CHANNEL_WEIGHT_FACTORS, K_WEIGHTING_BIQUAD_COEFFICIENTS } from './constants';
import type { Metrics } from './type';

/**
 * A class that implements the loudness algorithm as specified in ITU-R, EBU.
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class _ extends AudioWorkletProcessor {
  biquadraticFilters: [BiquadraticFilter, BiquadraticFilter][][] = [];
  blocks: number[][] = [];
  circularBuffers: [CircularBuffer<number>, CircularBuffer<number>, CircularBuffer<number>][] = [];
  currentMetrics: Metrics[] = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    const energyToLkfs = (energy: number) => -0.691 + 10 * Math.log10(energy + Number.EPSILON);
    const numberOfInputs = inputs.length;
    const numberOfChannels = inputs[0]?.length || 0;
    const numberOfSamples = inputs[0]?.[0]?.length || 0;
    const frameSize = numberOfSamples;

    if (frameSize === 0) {
      return true;
    }

    for (let i = 0; i < numberOfInputs; i++) {
      if (!this.biquadraticFilters[i]) {
        this.biquadraticFilters[i] = [];
      }

      if (!this.circularBuffers[i]) {
        this.circularBuffers[i] = [
          new CircularBuffer(Math.ceil(sampleRate * 0.4)),
          new CircularBuffer(Math.ceil(sampleRate * 0.4)),
          new CircularBuffer(Math.ceil(sampleRate * 3.0)),
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
            const { highshelf, highpass } = K_WEIGHTING_BIQUAD_COEFFICIENTS;

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
          const channelWeightedSample = squaredSample * (CHANNEL_WEIGHT_FACTORS[k] ?? 1.0);

          channelWeightedSampleSum += channelWeightedSample;

          outputs[i][k].set(inputs[i][k]);
        }

        for (const buffer of this.circularBuffers[i]) {
          buffer.push(channelWeightedSampleSum);
        }
      }
    }

    for (let i = 0; i < this.circularBuffers.length; i++) {
      const [integratedBuffer, momentaryBuffer, shortTermBuffer] = this.circularBuffers[i];

      if (!this.blocks[i]) {
        this.blocks[i] = [];
      }

      if (integratedBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const samples = integratedBuffer.slice();
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

        this.blocks[i].push(mean);
      }

      if (momentaryBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const samples = momentaryBuffer.slice();
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const lkfs = energyToLkfs(mean);

        this.currentMetrics[i].momentaryLoudness = lkfs;
      }

      if (shortTermBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const samples = shortTermBuffer.slice();
        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const lkfs = energyToLkfs(mean);

        this.currentMetrics[i].shortTermLoudness = lkfs;
      }
    }

    for (let i = 0; i < this.blocks.length; i++) {
      const blockLoudness = this.blocks[i].map(energyToLkfs);
      const absoluteGatedEnergy = this.blocks[i].filter((_, k) => blockLoudness[k] > -70);

      if (!absoluteGatedEnergy.length) {
        this.currentMetrics[i].integratedLoudness = Number.NEGATIVE_INFINITY;

        continue;
      }

      const absoluteGatedEnergySum = absoluteGatedEnergy.reduce((a, b) => a + b, 0);
      const absoluteGatedEnergyMean = absoluteGatedEnergySum / absoluteGatedEnergy.length;
      const absoluteGatedLoudness = energyToLkfs(absoluteGatedEnergyMean);
      const relativeGatedEnergy = absoluteGatedEnergy.filter(
        (v) => energyToLkfs(v) > absoluteGatedLoudness - 10
      );

      if (!relativeGatedEnergy.length) {
        this.currentMetrics[i].integratedLoudness = Number.NEGATIVE_INFINITY;

        continue;
      }

      const relativeEnergySum = relativeGatedEnergy.reduce((a, b) => a + b, 0);
      const relativeEnergyMean = relativeEnergySum / relativeGatedEnergy.length;
      const lkfs = energyToLkfs(relativeEnergyMean);

      this.currentMetrics[i].integratedLoudness = lkfs;
    }

    this.port.postMessage({ metrics: this.currentMetrics });

    return true;
  }
}

export { _ as LoudnessProcessor };
export type { Metrics };
