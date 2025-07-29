# Loudness Audio Worklet Processor

A real-time loudness meter for the `Web Audio API`, based on the [ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770) standard, implemented as an AudioWorkletProcessor.

## Installation

### Download

1. Download the pre-built file: [loudness.worklet.js](https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js).
2. Place `loudness.worklet.js` in your project directory (e.g., `/public/`).

```javascript
audioContext.audioWorklet.addModule("loudness.worklet.js");
```

### Import

Directly import the `AudioWorkletProcessor` file in your code:

```javascript
const module = new URL("https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js");
audioContext.audioWorklet.addModule(module);
```

## Quick Start

### Example

```html
<!doctype html>
<html>
  <body>
    <pre></pre>
    <script>
      const pre = document.querySelector("pre");
      navigator.mediaDevices.getDisplayMedia({ audio: true }).then((mediaStream) => {
        const context = new AudioContext();
        context.audioWorklet
          .addModule("https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js")
          .then(() => {
            const source = new MediaStreamAudioSourceNode(context, { mediaStream });
            const worklet = new AudioWorkletNode(context, "loudness-processor", {
              processorOptions: {
                interval: 0.1,
                capacity: 600
              }
            });

            source.connect(worklet).port.onmessage = (event) => {
              pre.textContent = JSON.stringify(event.data, null, 2);
            };
          });
      });
    </script>
  </body>
</html>
```

### File-based measurement

Suppose you already have an audio file (e.g., from an input[type="file"]):

```javascript
const arrayBuffer = await file.arrayBuffer();
const audioBuffer = await new AudioContext().decodeAudioData(arrayBuffer);

const { numberOfChannels, length, sampleRate } = audioBuffer;
const context = new OfflineAudioContext(numberOfChannels, length, sampleRate);

await context.audioWorklet.addModule("loudness.worklet.js");

const source = new AudioBufferSourceNode(context, { buffer: audioBuffer });
const worklet = new AudioWorkletNode(context, "loudness-processor");

worklet.port.onmessage = (event) => {
  console.log("Loudness Data:", event.data);
};

source.connect(worklet).connect(context.destination);
source.start();

context.startRendering();
```

### Live-based measurement

Supports `MediaStream` or `MediaElement` sources:

```javascript
const context = new AudioContext({ sampleRate: 48000 });

await context.audioWorklet.addModule("loudness.worklet.js");

const source = new MediaStreamAudioSourceNode(context, { mediaStream: mediaStream });
const worklet = new AudioWorkletNode(context, "loudness-processor", {
  processorOptions: {
    capacity: 600 // Seconds of history to keep, prevent memory overflow
  }
});

worklet.port.onmessage = (event) => {
  console.log("Loudness Data:", event.data);
};

source.connect(worklet).connect(context.destination);
```

## API

### Options

The `AudioWorkletNode` constructor accepts the following options:

#### Params

| Option   | Type     | Default | Description                                                                                                                                                                      |
| -------- | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| interval | `number` | `0`     | Message interval in seconds.                                                                                                                                                     |
| capacity | `number` | `null`  | Maximum seconds of history to keep. If set to `null`, the processor will not limit the history size. This is useful for preventing memory overflow in long-running measurements. |

#### Example

```javascript
const worklet = new AudioWorkletNode(context, "loudness-processor", {
  processorOptions: {
    interval: 0.01,
    capacity: 600
  }
});
```

### Message Format

Measurement results are sent back to the main thread via `port.onmessage` with the following format:

```typescript
type AudioLoudnessSnapshot = {
  currentFrame: number;
  currentTime: number;
  currentMetrics: [
    {
      momentaryLoudness: number;
      shortTermLoudness: number;
      integratedLoudness: number;
      maximumMomentaryLoudness: number;
      maximumShortTermLoudness: number;
      maximumTruePeakLevel: number;
      loudnessRange: number;
    }
  ];
};
```

### Units

| Metric                     | Unit          |
| -------------------------- | ------------- |
| `momentaryLoudness`        | `LUFS`/`LKFS` |
| `shortTermLoudness`        | `LUFS`/`LKFS` |
| `integratedLoudness`       | `LUFS`/`LKFS` |
| `maximumMomentaryLoudness` | `LUFS`/`LKFS` |
| `maximumShortTermLoudness` | `LUFS`/`LKFS` |
| `maximumTruePeakLevel`     | `dBTP`        |
| `loudnessRange`            | `LRA`         |

### Supported Channels

Supported channel counts: `1`,`2`,`6`,`8`,`10`,`12`,`24`

> Channel counts not listed above are weighted by `1.0`.

## Validation

### ITU-R BS.2217

The [ITU-R BS.2217](https://www.itu.int/pub/R-REP-BS.2217) test suite provides a table of compliance test files and related information for verifying that a meter
meets the specifications within Recommendation [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770).

| file                                 | measurement | channels |                    |
| ------------------------------------ | ----------- | -------- | ------------------ |
| 1770Comp_2_RelGateTest               | -10.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_AbsGateTest               | -69.5 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_25Hz_2ch           | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_100Hz_2ch          | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_500Hz_2ch          | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_1000Hz_2ch         | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_2000Hz_2ch         | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_24LKFS_10000Hz_2ch        | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_25Hz_2ch           | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_100Hz_2ch          | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_500Hz_2ch          | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_1000Hz_2ch         | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_2000Hz_2ch         | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_23LKFS_10000Hz_2ch        | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770Comp_2_18LKFS_FrequencySweep     | -18.0 LKFS  | 1        | :white_check_mark: |
| 1770Comp_2_24LKFS_SummingTest        | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_SummingTest        | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckLeft   | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckRight  | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckCentre | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckLFE    | -inf LKFS   | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckLs     | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_24LKFS_ChannelCheckRs     | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckLeft   | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckRight  | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LFKS_ChannelCheckCentre | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckLFE    | -inf LKFS   | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckLs     | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770Comp_2_23LKFS_ChannelCheckRs     | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinCntr-24LKFS       | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL+R-24LKFS        | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL-R-C-24LKFS      | -24.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf Stereo VinL+R-24LKFS     | -24.0 LKFS  | 2        | :white_check_mark: |
| 1770-2 Conf Mono Voice+Music-24LKFS  | -24.0 LKFS  | 1        | :white_check_mark: |
| 1770-2 Conf 6ch VinCntr-23LKFS       | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL+R-23LKFS        | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf 6ch VinL-R-C-23LKFS      | -23.0 LKFS  | 6        | :white_check_mark: |
| 1770-2 Conf Stereo VinL+R-23LKFS     | -23.0 LKFS  | 2        | :white_check_mark: |
| 1770-2 Conf Mono Voice+Music-23LKFS  | -23.0 LKFS  | 1        | :white_check_mark: |
| 1770Conf-8channels_24LKFS            | -24.0 LKFS  | 8        | :white_check_mark: |
| 1770Conf-8channels_23LKFS            | -23.0 LKFS  | 8        | :white_check_mark: |
| 1770Conf-10channels_24LKFS           | -24.0 LKFS  | 10       | :white_check_mark: |
| 1770Conf-10channels_23LKFS           | -23.0 LKFS  | 10       | :white_check_mark: |
| 1770Conf-12channels_24LKFS           | -24.0 LKFS  | 12       | :white_check_mark: |
| 1770Conf-12channels_23LKFS           | -23.0 LKFS  | 12       | :white_check_mark: |
| 1770Conf-24channels_24LKFS           | -24.0 LKFS  | 24       | :white_check_mark: |
| 1770Conf-24channels_23LKFS           | -23.0 LKFS  | 24       | :white_check_mark: |

### EBU TECH 3341 Minimum requirements test signals

[EBU TECH 3341](https://tech.ebu.ch/publications/tech3341) defines minimum requirements and corresponding test signals for verifying momentary, short-term, and integrated loudness accuracy, gating behavior, and true-peak measurement.

| file                                 | expected response and accepted tolerances                   |                    |
| ------------------------------------ | ----------------------------------------------------------- | ------------------ |
| seq-3341-1-16bit                     | M, S, I = −23.0 ±0.1 LUFS                                   | :white_check_mark: |
| seq-3341-2-16bit                     | M, S, I = −33.0 ±0.1 LUFS                                   | :white_check_mark: |
| seq-3341-3-16bit-v02                 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-4-16bit-v02                 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-5-16bit-v02                 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-6-6channels-WAVEEX-16bit    | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-7_seq-3342-5-24bit          | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-2011-8_seq-3342-6-24bit-v02 | I = −23.0 ±0.1 LUFS                                         | :white_check_mark: |
| seq-3341-9-24bit                     | S = −23.0 ±0.1 LUFS, constant after 3 s                     | :white_check_mark: |
| seq-3341-10-\*-24bit                 | Max S = −23.0 ±0.1 LUFS, for each segment                   | :white_check_mark: |
| seq-3341-11-24bit                    | Max S = −38.0, −37.0, …, −19.0 ±0.1 LUFS, successive values | :white_check_mark: |
| seq-3341-12-24bit                    | M = −23.0 ±0.1 LUFS, constant after 1 s                     | :white_check_mark: |
| seq-3341-13-\*-24bit                 | Max M = −23.0 ±0.1 LUFS, for each segment                   | :white_check_mark: |
| seq-3341-14-24bit                    | Max M = −38.0, …, −19.0 ±0.1 LUFS, successive values        | :white_check_mark: |
| seq-3341-15-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-16-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-17-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-18-24bit                    | Max true-peak = −6.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-19-24bit                    | Max true-peak = +3.0 +0.2/−0.4 dBTP                         | :white_check_mark: |
| seq-3341-20-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |
| seq-3341-21-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |
| seq-3341-22-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |
| seq-3341-23-24bit                    | Max true-peak = 0.0 +0.2/−0.4 dBTP                          | :white_check_mark: |

### EBU TECH 3342 Minimum requirements test signals

[EBU TECH 3342](https://tech.ebu.ch/publications/tech3342) focuses on the measurement of loudness range.

| file                                 | expected response and accepted tolerances |                    |
| ------------------------------------ | ----------------------------------------- | ------------------ |
| seq-3342-1-16bit                     | LRA = 10 ±1 LU                            | :white_check_mark: |
| seq-3342-2-16bit                     | LRA = 5 ±1 LU                             | :white_check_mark: |
| seq-3342-3-16bit                     | LRA = 20 ±1 LU                            | :white_check_mark: |
| seq-3342-4-16bit                     | LRA = 15 ±1 LU                            | :white_check_mark: |
| seq-3341-7_seq-3342-5-24bit          | LRA = 5 ±1 LU                             | :white_check_mark: |
| seq-3341-2011-8_seq-3342-6-24bit-v02 | LRA = 15 ±1 LU                            | :white_check_mark: |

## Acknowledgments

This project is a learning experiment aimed at exploring audio signal processing and ITU-R BS.1770 loudness measurement standards. I am not an expert in audio engineering or signal processing, and this project was developed as a way to better understand the concepts of audio loudness and implementation techniques. Thanks to the ITU-R BS.1770 standards for providing the theoretical basis for loudness measurement.

## License

This project is licensed under the [MIT License](LICENSE).

## References

- [ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770)
- [ITU-R BS.2217](https://www.itu.int/pub/R-REP-BS.2217)
- [EBU Tech 3341](https://tech.ebu.ch/publications/tech3341)
- [EBU Tech 3342](https://tech.ebu.ch/publications/tech3342)
