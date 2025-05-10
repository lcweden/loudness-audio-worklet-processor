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
class LoudnessProcessor extends AudioWorkletProcessor {
  kWeightingFilters: [BiquadraticFilter, BiquadraticFilter][][] = [];
  energyBuffers: [CircularBuffer<number>, CircularBuffer<number>, CircularBuffer<number>][] = [];
  energyBlocks: [number[], number[]][] = [];
  currentMetrics: Metrics[] = [];

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);

    for (let i = 0; i < options.numberOfInputs; i++) {
      this.currentMetrics[i] = {
        integratedLoudness: Number.NEGATIVE_INFINITY, // ok
        shortTermLoudness: Number.NEGATIVE_INFINITY, // ok
        momentaryLoudness: Number.NEGATIVE_INFINITY, // ok
        loudnessRange: Number.NEGATIVE_INFINITY, // ok
        truePeakLevel: Number.NEGATIVE_INFINITY,
        maximumMomentaryLoudness: Number.NEGATIVE_INFINITY, // ok
        maximumShortTermLoudness: Number.NEGATIVE_INFINITY, // ok
        maximumTruePeakLevel: Number.NEGATIVE_INFINITY,
        programLoudness: Number.NEGATIVE_INFINITY,
        targetLoudness: -23, // ok
        loudnessDeviation: Number.NEGATIVE_INFINITY, // ok
        samplePeak: Number.NEGATIVE_INFINITY,
        dynamicRange: Number.NEGATIVE_INFINITY,
      };
    }
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

          const [highshelfFilter, highpassFilter] = this.kWeightingFilters[i][k];
          const highshelfOutput = highshelfFilter.process(inputs[i][k][j]);
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
        this.energyBlocks[i] = [[], []];
      }

      if (integratedEnergyBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const energies = integratedEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

        this.energyBlocks[i][0].push(meanEnergy);
      }

      if (momentaryEnergyBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const energies = momentaryEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
        const loudness = energyToLkfs(meanEnergy);

        this.currentMetrics[i].momentaryLoudness = loudness;
        this.currentMetrics[i].maximumMomentaryLoudness = Math.max(
          this.currentMetrics[i].maximumMomentaryLoudness,
          loudness
        );
      }

      if (shortTermEnergyBuffer.isFull() && currentFrame % Math.ceil(sampleRate * 0.1) === 0) {
        const energies = shortTermEnergyBuffer.slice();
        const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;

        this.energyBlocks[i][1].push(meanEnergy);

        const loudness = energyToLkfs(meanEnergy);

        this.currentMetrics[i].shortTermLoudness = loudness;
        this.currentMetrics[i].maximumShortTermLoudness = Math.max(
          this.currentMetrics[i].maximumShortTermLoudness,
          loudness
        );
      }
    }

    for (let i = 0; i < this.energyBlocks.length; i++) {
      const integratedEnergyBlocks = this.energyBlocks[i][0];
      const shortTermEnergyBlocks = this.energyBlocks[i][1];

      if (integratedEnergyBlocks) {
        const integratedLoudnessBlocks = integratedEnergyBlocks.map(energyToLkfs);
        const absoluteGatedEnergyBlocks = integratedEnergyBlocks.filter(
          (_, k) => integratedLoudnessBlocks[k] > -70
        );

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
        this.currentMetrics[i].loudnessDeviation = loudness - this.currentMetrics[i].targetLoudness;
      }

      if (shortTermEnergyBlocks) {
        const shortTermLoudnessBlocks = shortTermEnergyBlocks.map(energyToLkfs);
        const sortedLoudnessBlocks = shortTermLoudnessBlocks.toSorted((a, b) => a - b);
        const lowerPercentileIndex = Math.floor(sortedLoudnessBlocks.length * 0.1);
        const upperPercentileIndex = Math.ceil(sortedLoudnessBlocks.length * 0.95);
        const trimmedLoudnessBlocks = sortedLoudnessBlocks.slice(
          lowerPercentileIndex,
          upperPercentileIndex
        );

        if (!trimmedLoudnessBlocks.length) {
          this.currentMetrics[i].loudnessRange = Number.NEGATIVE_INFINITY;
          continue;
        }

        const maxLoudness = Math.max(...trimmedLoudnessBlocks);
        const minLoudness = Math.min(...trimmedLoudnessBlocks);
        const loudnessRange = maxLoudness - minLoudness;

        this.currentMetrics[i].loudnessRange = loudnessRange;
      }
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
