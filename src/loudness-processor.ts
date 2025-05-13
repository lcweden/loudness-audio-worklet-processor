import { BiquadraticFilter } from './biquadratic-filter';
import { CircularBuffer } from './circular-buffer';
import { CHANNEL_WEIGHT_FACTORS, K_WEIGHTING_BIQUAD_COEFFICIENTS } from './constants';
import type { Metrics } from './types';

/**
 * A class that implements the loudness algorithm as specified in ITU-R BS.1771.
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  kWeightingFilters: [BiquadraticFilter, BiquadraticFilter][][] = [];
  momentaryEnergyBuffers: CircularBuffer<number>[] = [];
  shortTermEnergyBuffers: CircularBuffer<number>[] = [];
  shortTermLoudnessHistory: Array<number>[] = [];
  integratedEnergyBlocks: Array<number>[] = [];
  metrics: Metrics[] = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);

    for (let i = 0; i < options.numberOfInputs; i++) {
      this.metrics[i] = {
        momentaryLoudness: Number.NEGATIVE_INFINITY,
        shortTermLoudness: Number.NEGATIVE_INFINITY,
        integratedLoudness: Number.NEGATIVE_INFINITY,
        loudnessRange: Number.NEGATIVE_INFINITY,
        maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
      };
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const weightedInputs: Float32Array[][] = [];

    for (let i = 0; i < inputs.length; i++) {
      this.kWeightingFilters[i] ??= [];
      weightedInputs[i] = [];

      for (let j = 0; j < inputs[i].length; j++) {
        this.kWeightingFilters[i][j] ??= [
          new BiquadraticFilter(
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highshelf.a,
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highshelf.b
          ),
          new BiquadraticFilter(
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highpass.a,
            K_WEIGHTING_BIQUAD_COEFFICIENTS.highpass.b
          ),
        ];
        weightedInputs[i][j] = new Float32Array(inputs[i][j].length);

        for (let k = 0; k < inputs[i][j].length; k++) {
          const [highshelfFilter, highpassFilter] = this.kWeightingFilters[i][j];
          const highshelfOutput = highshelfFilter.process(inputs[i][j][k]);
          const highpassOutput = highpassFilter.process(highshelfOutput);
          const kWeightedSample = highpassOutput;
          const channelWeightedSample = kWeightedSample * CHANNEL_WEIGHT_FACTORS[j];

          weightedInputs[i][j][k] = channelWeightedSample;
        }
      }
    }

    for (let i = 0; i < weightedInputs.length; i++) {
      this.momentaryEnergyBuffers[i] ??= new CircularBuffer(Math.round(sampleRate * 0.4));
      this.shortTermEnergyBuffers[i] ??= new CircularBuffer(Math.round(sampleRate * 3.0));

      for (let j = 0; j < weightedInputs[0][0].length; j++) {
        let sumOfSquaredChannelWeightedSamples = 0;

        for (let k = 0; k < weightedInputs[0].length; k++) {
          sumOfSquaredChannelWeightedSamples += weightedInputs[i][k][j] ** 2;
        }

        this.momentaryEnergyBuffers[i].push(sumOfSquaredChannelWeightedSamples);
        this.shortTermEnergyBuffers[i].push(sumOfSquaredChannelWeightedSamples);
      }
    }

    for (let i = 0; i < this.momentaryEnergyBuffers.length; i++) {
      this.integratedEnergyBlocks[i] ??= new Array();

      if (!this.momentaryEnergyBuffers[i].isFull()) {
        continue;
      }

      if (currentFrame % Math.round(sampleRate * 0.1) !== 0) {
        continue;
      }

      const energies = this.momentaryEnergyBuffers[i].slice();
      const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      const loudness = -0.691 + 10 * Math.log10(meanEnergy + Number.EPSILON);

      this.metrics[i].momentaryLoudness = loudness;
      this.integratedEnergyBlocks[i].push(meanEnergy);
    }

    for (let i = 0; i < this.shortTermEnergyBuffers.length; i++) {
      if (!this.shortTermEnergyBuffers[i].isFull()) {
        continue;
      }

      if (currentFrame % Math.round(sampleRate * 0.1) !== 0) {
        continue;
      }

      this.shortTermLoudnessHistory[i] ??= new Array();

      const energies = this.shortTermEnergyBuffers[i].slice();
      const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      const loudness = -0.691 + 10 * Math.log10(meanEnergy + Number.EPSILON);

      this.metrics[i].shortTermLoudness = loudness;
      this.shortTermLoudnessHistory[i].push(loudness);
    }

    for (let i = 0; i < this.shortTermLoudnessHistory.length; i++) {
      if (this.shortTermLoudnessHistory[i].length < 2) {
        continue;
      }

      const sortedLoudnesses = this.shortTermLoudnessHistory[i].toSorted((a, b) => a - b);
      const [lowerPercentile, upperPercentile] = [0.1, 0.95].map((percentile) => {
        const lowerIndex = Math.floor(percentile * (sortedLoudnesses.length - 1));
        const upperIndex = Math.ceil(percentile * (sortedLoudnesses.length - 1));

        if (upperIndex === lowerIndex) {
          return sortedLoudnesses[lowerIndex];
        }

        return (
          sortedLoudnesses[lowerIndex] +
          (sortedLoudnesses[upperIndex] - sortedLoudnesses[lowerIndex]) *
            (percentile * (sortedLoudnesses.length - 1) - lowerIndex)
        );
      });

      const loudnessRange = upperPercentile - lowerPercentile;

      this.metrics[i].loudnessRange = loudnessRange;
    }

    for (let i = 0; i < this.integratedEnergyBlocks.length; i++) {
      const integratedLoudnesses = this.integratedEnergyBlocks[i].map(
        (energy) => -0.691 + 10 * Math.log10(energy + Number.EPSILON)
      );
      const absoluteGatedEnergyBlocks = this.integratedEnergyBlocks[i].filter(
        (_, index) => integratedLoudnesses[index] > -70
      );

      if (!absoluteGatedEnergyBlocks.length) {
        continue;
      }

      const sumOfAbsoluteGatedEnergy = absoluteGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const absoluteGatedMeanEnergy = sumOfAbsoluteGatedEnergy / absoluteGatedEnergyBlocks.length;
      const absoluteGatedLoudness =
        -0.691 + 10 * Math.log10(absoluteGatedMeanEnergy + Number.EPSILON);
      const relativeGatedEnergyBlocks = absoluteGatedEnergyBlocks.filter(
        (energy) => -0.691 + 10 * Math.log10(energy + Number.EPSILON) > absoluteGatedLoudness - 10
      );

      if (!relativeGatedEnergyBlocks.length) {
        continue;
      }

      const sumOfRelativeGatedEnergy = relativeGatedEnergyBlocks.reduce((a, b) => a + b, 0);
      const relativeGatedMeanEnergy = sumOfRelativeGatedEnergy / relativeGatedEnergyBlocks.length;
      const loudness = -0.691 + 10 * Math.log10(relativeGatedMeanEnergy + Number.EPSILON);

      this.metrics[i].integratedLoudness = loudness;
    }

    for (let i = 0; i < outputs.length; i++) {
      for (let j = 0; j < outputs[i].length; j++) {
        outputs[i][j].set(inputs[i][j]);
      }
    }

    this.port.postMessage(this.metrics);

    return true;
  }
}

export { LoudnessProcessor };
