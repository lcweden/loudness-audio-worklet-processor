import { Accessor, createEffect, mergeProps, onMount } from 'solid-js';
import { AudioLoudnessSnapshot, Metrics } from '../../types';
import { createChart } from '../composables';

type LoudnessSnapshotsChartProps = {
  getIsProcessing: Accessor<boolean>;
  getIsProcessFinish: Accessor<boolean>;
  getSnapshots: Accessor<AudioLoudnessSnapshot[]>;
};

function LoudnessSnapshotsChart(loudnessSnapshotsChartProps: LoudnessSnapshotsChartProps) {
  const { getSnapshots, getIsProcessFinish, getIsProcessing } = mergeProps(loudnessSnapshotsChartProps);
  const snapshotChart = createChart();
  const legends: Array<[string, keyof Metrics]> = [
    ['Integrated', 'integratedLoudness'],
    ['Short-term', 'shortTermLoudness'],
    ['Momentary', 'momentaryLoudness'],
  ];

  let chartRef: HTMLDivElement;

  createEffect(() => {
    const snapshots = getSnapshots();
    const isProccessFinish = getIsProcessFinish();

    if (isProccessFinish && snapshots) {
      snapshotChart.setIsLoading(false);
      snapshotChart.setOption({
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: snapshots.map((snapshot) => snapshot.currentTime),
          name: 'Time',
        },
        yAxis: { type: 'value', name: 'Loudness', min: 'dataMin', max: 'dataMax' },
        series: legends.map(([key, value]) => ({
          name: key,
          data: snapshots.map((snapshot) => {
            const loudness = snapshot.currentMetrics[0][value];
            return loudness === Number.NEGATIVE_INFINITY ? null : loudness;
          }),
          type: 'line',
          smooth: true,
          emphasis: { focus: 'series' },
          lineStyle: { width: 4 },
          sampling: 'lttb',
          dataZoom: [{ type: 'inside', throttle: 50 }, { type: 'slider' }],
        })),
      });
    }
  });

  createEffect(() => {
    const isProccessing = getIsProcessing();

    if (isProccessing) {
      snapshotChart.setIsLoading(true, {
        text: '',
        color: '#000000',
        fontSize: 24,
        showSpinner: true,
        spinnerRadius: 20,
        lineWidth: 3,
      });
    }
  });

  onMount(() => {
    snapshotChart.init(chartRef);
  });

  return <div ref={(element) => (chartRef = element)} class="min-h-96 w-full" />;
}

export { LoudnessSnapshotsChart };
