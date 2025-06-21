# Loudness Audio Worklet Processor

A real-time loudness meter for `Web Audio API` based on the ITU-R BS.1770-5 standard, implemented as an `AudioWorkletProcessor`.

## Installation

Download pre-built file [loudness.worklet.js](https://lcweden.github.io/loudness-audio-worklet-processor/loudness.worklet.js)

## Usage

1. Register the processor in your audio context:

   ```javascript
   audioContext.audioWorklet.addModule('loudness.worklet.js').then(() => {
     const loudnessNode = new AudioWorkletNode(audioContext, 'loudness-processor');
     audioSource.connect(loudnessNode).connect(audioContext.destination);

     loudnessNode.port.onmessage = (event) => {
       console.log('Loudness Data:', event.data);
     };
   });
   ```

2. The processor outputs the following via the `port`:

   ```json
   {
     "currentFrame": 2048,
     "currentTime": 3.42,
     "currentMetrics": [
       {
         "momentaryLoudness": -18.2,
         "shortTermLoudness": -17.5,
         "integratedLoudness": -20.0,
         "loudnessRange": 6.2,
         "maximumTruePeakLevel": -0.8
       }
     ]
   }
   ```

## Validation

### ITU-R BS.2217

| file                                                                                                       | measurement | channels |     |
| ---------------------------------------------------------------------------------------------------------- | ----------- | -------- | --- |
| [1770Comp_2_RelGateTest](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010030ZIPM.zip)               | -10.0 LKFS  | 2        | [x] |
| [1770Comp_2_AbsGateTest](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010029ZIPM.zip)               | -69.5 LKFS  | 2        | [x] |
| [1770Comp_2_24LKFS_25Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010016ZIPM.zip)           | -24.0 LKFS  | 2        | []  |
| [1770Comp_2_24LKFS_100Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010017ZIPM.zip)          | -24.0 LKFS  | 2        | []  |
| [1770Comp_2_24LKFS_500Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010018ZIPM.zip)          | -24.0 LKFS  | 2        | []  |
| [1770Comp_2_24LKFS_1000Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010019ZIPM.zip)         | -24.0 LKFS  | 2        | []  |
| [1770Comp_2_24LKFS_2000Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010020ZIPM.zip)         | -24.0 LKFS  | 2        | []  |
| [1770Comp_2_24LKFS_10000Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010021ZIPM.zip)        | -24.0 LKFS  | 2        | []  |
| [1770Comp_2_23LKFS_25Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010003ZIPM.zip)           | -23.0 LKFS  | 2        | []  |
| [1770Comp_2_23LKFS_100Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010004ZIPM.zip)          | -23.0 LKFS  | 2        | []  |
| [1770Comp_2_23LKFS_500Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010005ZIPM.zip)          | -23.0 LKFS  | 2        | []  |
| [1770Comp_2_23LKFS_1000Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010006ZIPM.zip)         | -23.0 LKFS  | 2        | []  |
| [1770Comp_2_23LKFS_2000Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010007ZIPM.zip)         | -23.0 LKFS  | 2        | []  |
| [1770Comp_2_23LKFS_10000Hz_2ch](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010008ZIPM.zip)        | -23.0 LKFS  | 2        | []  |
| [1770Comp_2_18LKFS_FrequencySweep](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010002ZIPM.zip)     | -18.0 LKFS  | 1        | []  |
| [1770Comp_2_24LKFS_SummingTest](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010028ZIPM.zip)        | -24.0 LKFS  | 6        | []  |
| [1770Comp_2_23LKFS_SummingTest](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010015ZIPM.zip)        | -23.0 LKFS  | 6        | []  |
| [1770Comp_2_24LKFS_ChannelCheckLeft](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010023ZIPM.zip)   | -24.0 LKFS  | 6        | []  |
| [1770Comp_2_24LKFS_ChannelCheckRight](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010026ZIPM.zip)  | -24.0 LKFS  | 6        | []  |
| [1770Comp_2_24LKFS_ChannelCheckCentre](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010022ZIPM.zip) | -24.0 LKFS  | 6        | []  |
| [1770Comp_2_24LKFS_ChannelCheckLFE](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010024ZIPM.zip)    | -inf LKFS   | 6        | []  |
| [1770Comp_2_24LKFS_ChannelCheckLs](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010025ZIPM.zip)     | -24.0 LKFS  | 6        | []  |
| [1770Comp_2_24LKFS_ChannelCheckRs](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010027ZIPM.zip)     | -24.0 LKFS  | 6        | []  |
| [1770Comp_2_23LKFS_ChannelCheckLeft](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010010ZIPM.zip)   | -23.0 LKFS  | 6        | []  |
| [1770Comp_2_23LKFS_ChannelCheckRight](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010013ZIPM.zip)  | -23.0 LKFS  | 6        | []  |
| [1770Comp_2_23LFKS_ChannelCheckCentre](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010009ZIPM.zip) | -23.0 LKFS  | 6        | []  |
| [1770Comp_2_23LKFS_ChannelCheckLFE](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010011ZIPM.zip)    | -inf LKFS   | 6        | []  |
| [1770Comp_2_23LKFS_ChannelCheckLs](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010012ZIPM.zip)     | -23.0 LKFS  | 6        | []  |
| [1770Comp_2_23LKFS_ChannelCheckRs](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010014ZIPM.zip)     | -23.0 LKFS  | 6        | []  |
| [1770-2 Conf 6ch VinCntr-24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010032ZIPM.zip)       | -24.0 LKFS  | 6        | []  |
| [1770-2 Conf 6ch VinL+R-24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010034ZIPM.zip)        | -24.0 LKFS  | 6        | []  |
| [1770-2 Conf 6ch VinL-R-C-24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010036ZIPM.zip)      | -24.0 LKFS  | 6        | []  |
| [1770-2 Conf Stereo VinL+R-24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010040ZIPM.zip)     | -24.0 LKFS  | 2        | []  |
| [1770-2 Conf Mono Voice+Music-24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010038ZIPM.zip)  | -24.0 LKFS  | 1        | []  |
| [1770-2 Conf 6ch VinCntr-23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010031ZIPM.zip)       | -23.0 LKFS  | 6        | []  |
| [1770-2 Conf 6ch VinL+R-23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010033ZIPM.zip)        | -23.0 LKFS  | 6        | []  |
| [1770-2 Conf 6ch VinL-R-C-23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010035ZIPM.zip)      | -23.0 LKFS  | 6        | []  |
| [1770-2 Conf Stereo VinL+R-23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010039ZIPM.zip)     | -23.0 LKFS  | 2        | []  |
| [1770-2 Conf Mono Voice+Music-23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010037ZIPM.zip)  | -23.0 LKFS  | 1        | []  |
| [1770Conf-8channels_24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010041ZIPM.zip)            | -24.0 LKFS  | 8        | []  |
| [1770Conf-8channels_23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010042ZIPM.zip)            | -23.0 LKFS  | 8        | []  |
| [1770Conf-10channels_24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010043ZIPM.zip)           | -24.0 LKFS  | 10       | []  |
| [1770Conf-10channels_23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010044ZIPM.zip)           | -23.0 LKFS  | 10       | []  |
| [1770Conf-12channels_24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010045ZIPM.zip)           | -24.0 LKFS  | 12       | []  |
| [1770Conf-12channels_23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010046ZIPM.zip)           | -23.0 LKFS  | 12       | []  |
| [1770Conf-24channels_24LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010047ZIPM.zip)           | -24.0 LKFS  | 24       | []  |
| [1770Conf-24channels_23LKFS](http://www.itu.int/dms_pub/itu-r/oth/11/02/R11020000010048ZIPM.zip)           | -23.0 LKFS  | 24       | []  |

## Acknowledgments

This project is a learning experiment aimed at exploring audio signal processing and ITU-R BS.1770 loudness measurement standards. I am not an expert in audio engineering or signal processing, and this project was developed as a way to better understand the concepts of audio loudness and implementation techniques. Thanks to the ITU-R BS.1770 standards for providing the theoretical basis for loudness measurement.

## License

This project is licensed under the [MIT License](LICENSE).
