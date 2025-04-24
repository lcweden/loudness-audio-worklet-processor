/**
 * A class that implements the loudness algorithm as specified in ITU-R BS.1770-5.
 *
 * @class
 * @extends AudioWorkletProcessor
 */
class LoudnessProcessor extends AudioWorkletProcessor {
  static kWeightingFilterCoefficients = {
    highShelf: {
      a: [1.0, -1.69065929318241, 0.73248077421585],
      b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
    },
    highPass: {
      a: [1.0, -1.99004745483398, 0.99007225036621],
      b: [1.0, -2.0, 1.0],
    },
  };

  static channelWeights = [1.0, 1.0, 1.0, 0.0, 1.41, 1.41, 1.41, 1.41];

  #sampleRate: number;

  #kWeightingFilterStates: { x: Float32Array; y: Float32Array }[][][] = [];

  #loudnessBuffers: Map<'integrated' | 'momentary' | 'short-term', number[]>[] = [];

  #loudnessHistories: Map<'integrated' | 'momentary' | 'short-term', number[]>[] = [];

  #loudnessData: {
    integratedLoudness: number;
    momentaryLoudness: number;
    shortTermLoudness: number;
    loudnessRange: number;
    truePeak: number;
  }[] = [];

  #lastLoudnessDataSnapshot: string = '';

  constructor(options: AudioWorkletProcessorOptions) {
    super(options);

    this.#sampleRate = sampleRate;

    this.#loudnessBuffers = Array.from(
      { length: options.numberOfInputs },
      () =>
        new Map([
          ['integrated', []],
          ['momentary', []],
          ['short-term', []],
        ])
    );

    this.#loudnessHistories = Array.from(
      { length: options.numberOfInputs },
      () =>
        new Map([
          ['integrated', []],
          ['momentary', []],
          ['short-term', []],
        ])
    );

    this.#loudnessData = Array.from({ length: options.numberOfInputs }, () => ({
      integratedLoudness: -Infinity,
      momentaryLoudness: -Infinity,
      shortTermLoudness: -Infinity,
      loudnessRange: -Infinity,
      truePeak: -Infinity,
    }));

    if (this.#sampleRate !== 48000) {
      console.warn('The sample rate is not 48kHz, which may lead to inaccurate measurements.');
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]) {
    if (!inputs || !inputs.length || !inputs[0] || !inputs[0].length || !inputs[0][0].length) {
      return true;
    }

    const kWeightedSamples: number[][][] = [];
    const kWeightedSquares: number[][][] = [];

    /**
     * Stage 1: “K” frequency weighting
     */
    for (let i = 0; i < inputs.length; i++) {
      if (!this.#kWeightingFilterStates[i]) {
        this.#kWeightingFilterStates[i] = [];
      }

      if (!kWeightedSamples[i]) {
        kWeightedSamples[i] = [];
      }

      for (let j = 0; j < inputs[i].length; j++) {
        if (!this.#kWeightingFilterStates[i][j]) {
          this.#kWeightingFilterStates[i][j] = Array.from({ length: 2 }, () => ({
            x: new Float32Array(3).fill(0),
            y: new Float32Array(2).fill(0),
          }));
        }

        if (!kWeightedSamples[i][j]) {
          kWeightedSamples[i][j] = [];
        }

        for (let k = 0; k < inputs[i][j].length; k++) {
          const coefficients = LoudnessProcessor.kWeightingFilterCoefficients;
          const filterStages = this.#kWeightingFilterStates[i][j];

          filterStages[0].x[2] = filterStages[0].x[1];
          filterStages[0].x[1] = filterStages[0].x[0];
          filterStages[0].x[0] = inputs[i][j][k];

          const firstStageOutput =
            coefficients.highShelf.b[0] * filterStages[0].x[0] +
            coefficients.highShelf.b[1] * filterStages[0].x[1] +
            coefficients.highShelf.b[2] * filterStages[0].x[2] -
            coefficients.highShelf.a[1] * filterStages[0].y[0] -
            coefficients.highShelf.a[2] * filterStages[0].y[1];

          filterStages[0].y[1] = filterStages[0].y[0];
          filterStages[0].y[0] = firstStageOutput;

          filterStages[1].x[2] = filterStages[1].x[1];
          filterStages[1].x[1] = filterStages[1].x[0];
          filterStages[1].x[0] = firstStageOutput;

          const secondStageOutput =
            coefficients.highPass.b[0] * filterStages[1].x[0] +
            coefficients.highPass.b[1] * filterStages[1].x[1] +
            coefficients.highPass.b[2] * filterStages[1].x[2] -
            coefficients.highPass.a[1] * filterStages[1].y[0] -
            coefficients.highPass.a[2] * filterStages[1].y[1];

          filterStages[1].y[1] = filterStages[1].y[0];
          filterStages[1].y[0] = secondStageOutput;

          kWeightedSamples[i][j].push(secondStageOutput);
        }

        outputs[i][j].set(inputs[i][j]);
      }
    }

    /**
     * Stage 2: Mean square calculation for each channel
     */
    for (let i = 0; i < kWeightedSamples.length; i++) {
      if (!kWeightedSquares[i]) {
        kWeightedSquares[i] = [];
      }

      for (let j = 0; j < kWeightedSamples[i].length; j++) {
        if (!kWeightedSquares[i][j]) {
          kWeightedSquares[i][j] = [];
        }

        for (let k = 0; k < kWeightedSamples[i][j].length; k++) {
          const kWeightedSquare = kWeightedSamples[i][j][k] ** 2;

          kWeightedSquares[i][j].push(kWeightedSquare);
        }
      }
    }

    /**
     * Stage 3: Channel-weighted summation, surround channels have larger weights, and the LFE channel is excluded
     */
    for (let i = 0; i < kWeightedSquares.length; i++) {
      const integratedLoudnessBuffers = this.#loudnessBuffers[i].get('integrated');
      const momentaryLoudnessBuffers = this.#loudnessBuffers[i].get('momentary');
      const shortTermLoudnessBuffers = this.#loudnessBuffers[i].get('short-term');
      const minimumChannelLength = Math.min(...kWeightedSquares[i].map((v) => v.length));

      for (let j = 0; j < minimumChannelLength; j++) {
        let channelWeightedEnergySum = 0;

        for (let k = 0; k < kWeightedSquares[i].length; k++) {
          const energy = kWeightedSquares[i][k][j];
          const weight = LoudnessProcessor.channelWeights[k] ?? 1.0;

          channelWeightedEnergySum += energy * weight;
        }

        if (integratedLoudnessBuffers) {
          integratedLoudnessBuffers.push(channelWeightedEnergySum);
        }

        if (momentaryLoudnessBuffers) {
          momentaryLoudnessBuffers.push(channelWeightedEnergySum);
        }

        if (shortTermLoudnessBuffers) {
          shortTermLoudnessBuffers.push(channelWeightedEnergySum);
        }
      }
    }

    /**
     * Stage 3.5: Data pre-proccess
     */
    for (let i = 0; i < this.#loudnessBuffers.length; i++) {
      const integratedLoudnessBuffers = this.#loudnessBuffers[i].get('integrated');
      const integratedLoudnessHistory = this.#loudnessHistories[i].get('integrated');
      const momentaryLoudnessBuffers = this.#loudnessBuffers[i].get('momentary');
      const momentaryLoudnessHistory = this.#loudnessHistories[i].get('momentary');
      const shortTermLoudnessBuffers = this.#loudnessBuffers[i].get('short-term');
      const shortTermLoudnessHistory = this.#loudnessHistories[i].get('short-term');

      if (integratedLoudnessBuffers && integratedLoudnessHistory) {
        const blockSize = Math.floor(this.#sampleRate * 0.4);
        const hopSize = Math.floor(blockSize * (1 - 0.75));

        while (integratedLoudnessBuffers.length >= blockSize) {
          const audioBlock = integratedLoudnessBuffers.slice(0, blockSize);
          const meanSquare = audioBlock.reduce((a, b) => a + b, 0) / audioBlock.length;
          const loudness = -0.691 + 10 * Math.log10(Math.max(meanSquare, 1e-12));

          integratedLoudnessHistory.push(loudness);
          integratedLoudnessBuffers.splice(0, hopSize);
        }
      }

      if (momentaryLoudnessBuffers && momentaryLoudnessHistory) {
        const windowSize = Math.floor(this.#sampleRate * 0.4);
        const updateRate = Math.floor(this.#sampleRate * 0.1);

        while (momentaryLoudnessBuffers.length > windowSize) {
          momentaryLoudnessBuffers.shift();
        }

        if (momentaryLoudnessBuffers.length === windowSize) {
          const bufferSum = momentaryLoudnessBuffers.reduce((a, b) => a + b, 0);
          const meanSquare = bufferSum / momentaryLoudnessBuffers.length;
          const loudness = -0.691 + 10 * Math.log10(Math.max(meanSquare, 1e-12));

          momentaryLoudnessHistory.push(loudness);
          momentaryLoudnessBuffers.splice(0, updateRate);
        }
      }

      if (shortTermLoudnessBuffers && shortTermLoudnessHistory) {
        const windowSize = Math.floor(this.#sampleRate * 3.0);
        const updateRate = Math.floor(this.#sampleRate * 0.1);

        while (shortTermLoudnessBuffers.length > windowSize) {
          shortTermLoudnessBuffers.shift();
        }

        if (shortTermLoudnessBuffers.length === windowSize) {
          const bufferSum = shortTermLoudnessBuffers.reduce((a, b) => a + b, 0);
          const meanSquare = bufferSum / shortTermLoudnessBuffers.length;
          const loudness = -0.691 + 10 * Math.log10(Math.max(meanSquare, 1e-12));

          shortTermLoudnessHistory.push(loudness);
          shortTermLoudnessBuffers.splice(0, updateRate);
        }
      }
    }

    /**
     * Stage 4: Gating of 400 ms blocks (overlapping by 75%), where two thresholds are used
     * - the first at −70 LKFS;
     * - the second at −10 dB relative to the level measured after application of the first threshold;
     */
    for (let i = 0; i < this.#loudnessHistories.length; i++) {
      const integratedLoudnessHistory = this.#loudnessHistories[i].get('integrated');
      const momentaryLoudnessHistory = this.#loudnessHistories[i].get('momentary');
      const shortTermLoudnessHistory = this.#loudnessHistories[i].get('short-term');

      if (integratedLoudnessHistory && integratedLoudnessHistory.length) {
        const firstStageOutput = integratedLoudnessHistory.filter((v) => v > -70);

        if (!firstStageOutput.length) {
          this.#loudnessData[i].integratedLoudness = -Infinity;
          continue;
        }

        const sumOfFirstStageOutput = firstStageOutput.reduce((a, b) => a + b, 0);
        const meanOfFirstStageOutput = sumOfFirstStageOutput / firstStageOutput.length;

        const secondStageOutput = firstStageOutput.filter((v) => v > meanOfFirstStageOutput - 10);

        if (!secondStageOutput.length) {
          this.#loudnessData[i].integratedLoudness = -Infinity;
          continue;
        }

        const sumOfSecondStageOutput = secondStageOutput.reduce((a, b) => a + b, 0);
        const meanOfSecondStageOutput = sumOfSecondStageOutput / secondStageOutput.length;
        const integratedLoudness = meanOfSecondStageOutput;

        this.#loudnessData[i].integratedLoudness = integratedLoudness;
      } else {
        this.#loudnessData[i].integratedLoudness = -Infinity;
      }

      if (shortTermLoudnessHistory && shortTermLoudnessHistory.length) {
        const latestShortTermLoudness = shortTermLoudnessHistory.at(-1);

        if (latestShortTermLoudness) {
          this.#loudnessData[i].shortTermLoudness = latestShortTermLoudness;
        } else {
          this.#loudnessData[i].shortTermLoudness = -Infinity;
        }

        const sortedShortTermLoudnesses = shortTermLoudnessHistory.toSorted((a, b) => a - b);
        const lower = Math.floor(sortedShortTermLoudnesses.length * 0.1);
        const upper = Math.ceil(sortedShortTermLoudnesses.length * 0.95) - 1;
        const loudnessRange = sortedShortTermLoudnesses[upper] - sortedShortTermLoudnesses[lower];

        this.#loudnessData[i].loudnessRange = loudnessRange;
      } else {
        this.#loudnessData[i].shortTermLoudness = -Infinity;
        this.#loudnessData[i].loudnessRange = -Infinity;
      }

      if (momentaryLoudnessHistory && momentaryLoudnessHistory.length) {
        const latestMomentaryLoudness = momentaryLoudnessHistory.at(-1);

        if (latestMomentaryLoudness) {
          this.#loudnessData[i].momentaryLoudness = latestMomentaryLoudness;
        } else {
          this.#loudnessData[i].momentaryLoudness = -Infinity;
        }
      } else {
        this.#loudnessData[i].momentaryLoudness = -Infinity;
      }
    }

    /**
     * TODO: Upgrate to FIR filter
     */
    for (let i = 0; i < outputs.length; i++) {
      let maxTruePeak = 0;

      for (let j = 0; j < outputs[i].length; j++) {
        for (let k = 0; k < outputs[i][j].length - 1; k++) {
          const s0 = outputs[i][j][k];
          const s1 = outputs[i][j][k + 1];

          for (let l = 0; l < 4; l++) {
            const interp = s0 + (s1 - s0) * (l / 4);

            maxTruePeak = Math.max(maxTruePeak, Math.abs(interp));
          }
        }
      }

      const truePeak = 20 * Math.log10(Math.max(maxTruePeak + 1e-12));

      this.#loudnessData[i].truePeak = truePeak;
    }

    const currentloudnessDataSnapshot = JSON.stringify(this.#loudnessData);
    const lastLoudnessDataSnapshot = this.#lastLoudnessDataSnapshot;

    if (currentloudnessDataSnapshot !== lastLoudnessDataSnapshot) {
      this.#lastLoudnessDataSnapshot = currentloudnessDataSnapshot;
      this.port.postMessage(this.#loudnessData);
    }

    return true;
  }
}

registerProcessor('loudness', LoudnessProcessor);
