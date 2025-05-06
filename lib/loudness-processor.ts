import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import { CHANNEL_WEIGHT_FACTORS, K_WEIGHTING_BIQUAD_COEFFICIENTS } from './constants';
import type { EnergyBuffer, KWeightingFilters, Metrics } from './type';

/**
 * A class that implements the loudness algorithm as specified in ITU-R, EBU.
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  kWeightingFilters: KWeightingFilters<BiquadraticFilter> = [];
  energyBuffers: EnergyBuffer<CircularBuffer<number>> = [];
  energyBlocks: number[][] = [];
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
      if (!this.kWeightingFilters[i]) {
        this.kWeightingFilters[i] = [];
      }

      if (!this.energyBuffers[i]) {
        this.energyBuffers[i] = [
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
        let totalWeightedEnergy = 0;

        for (let k = 0; k < numberOfChannels; k++) {
          if (!this.kWeightingFilters[i][k]) {
            const { highshelf, highpass } = K_WEIGHTING_BIQUAD_COEFFICIENTS;

            this.kWeightingFilters[i][k] = [
              new BiquadraticFilter(highshelf.a, highshelf.b),
              new BiquadraticFilter(highpass.a, highpass.b),
            ];
          }

          const sample = inputs[i][k][j];
          const [highshelfFilter, highpassFilter] = this.kWeightingFilters[i][k];
          const highshelfOutput = highshelfFilter.process(sample);
          const highpassOutput = highpassFilter.process(highshelfOutput);
          const kWeightedSample = highpassOutput;
          const squaredKWeightedSample = kWeightedSample * kWeightedSample;
          const channelWeightedSample = squaredKWeightedSample * (CHANNEL_WEIGHT_FACTORS[k] ?? 1.0);

          totalWeightedEnergy += channelWeightedSample;
        }

        for (const buffer of this.energyBuffers[i]) {
          buffer.push(totalWeightedEnergy);
        }
      }
    }

    for (let i = 0; i < this.energyBuffers.length; i++) {
      const integratedEnergyBuffer = this.energyBuffers[i][0];
      const momentaryEnergyBuffer = this.energyBuffers[i][1];
      const shortTermEnergyBuffer = this.energyBuffers[i][2];

      if (!this.energyBlocks[i]) {
        this.energyBlocks[i] = [];
      }

      if (integratedEnergyBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const energies = integratedEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

        this.energyBlocks[i].push(meanEnergy);
      }

      if (momentaryEnergyBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const energies = momentaryEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const loudness = energyToLkfs(meanEnergy);

        this.currentMetrics[i].momentaryLoudness = loudness;
      }

      if (shortTermEnergyBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const energies = shortTermEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const loudness = energyToLkfs(meanEnergy);

        this.currentMetrics[i].shortTermLoudness = loudness;
      }
    }

    for (let i = 0; i < this.energyBlocks.length; i++) {
      const blocks = this.energyBlocks[i].map(energyToLkfs);
      const absoluteGatedEnergyBlocks = this.energyBlocks[i].filter((_, k) => blocks[k] > -70);

      if (!absoluteGatedEnergyBlocks.length) {
        this.currentMetrics[i].integratedLoudness = Number.NEGATIVE_INFINITY;
        continue;
      }

      const sumOfAbsoluteGatedEnergy = absoluteGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergyBlocks.length;
      const absoluteGatedLoudness = energyToLkfs(absoluteGatedMeanEnergy);
      const relativeGatedEnergyBlocks = absoluteGatedEnergyBlocks.filter(
        (v) => energyToLkfs(v) > absoluteGatedLoudness - 10
      );

      if (!relativeGatedEnergyBlocks.length) {
        this.currentMetrics[i].integratedLoudness = Number.NEGATIVE_INFINITY;
        continue;
      }

      const sumOfRelativeGatedEnergy = relativeGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const relativeGatedMeanEnergy = sumOfRelativeGatedEnergy / relativeGatedEnergyBlocks.length;
      const loudness = energyToLkfs(relativeGatedMeanEnergy);

      this.currentMetrics[i].integratedLoudness = loudness;
    }

    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        outputs[i][j].set(inputs[i][j]);
      }
    }

    this.port.postMessage({ currentFrame, currentTime, currentMetrics: this.currentMetrics });

    return true;
  }
}

export { LoudnessProcessor };
export type { Metrics };
