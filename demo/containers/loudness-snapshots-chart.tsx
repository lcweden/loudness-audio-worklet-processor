import { Accessor, createEffect, mergeProps, onMount } from 'solid-js';
import { AudioLoudnessSnapshot, Metrics } from '../../types';
import { createChart } from '../composables';

type LoudnessSnapshotsChartProps = {
  getIsProccessing: Accessor<boolean>;
  getIsProccessFinish: Accessor<boolean>;
  getSnapshots: Accessor<AudioLoudnessSnapshot[]>;
};

function LoudnessSnapshotsChart(loudnessSnapshotsChartProps: LoudnessSnapshotsChartProps) {
  const { getSnapshots, getIsProccessFinish, getIsProccessing } = mergeProps(loudnessSnapshotsChartProps);
  const snapshotChart = createChart();
  const legends: Array<[string, keyof Metrics]> = [
    ['Integrated', 'integratedLoudness'],
    ['Short-term', 'shortTermLoudness'],
    ['Momentary', 'momentaryLoudness'],
  ];

  let chartRef: HTMLDivElement;

  createEffect(() => {
    const snapshots = getSnapshots();
    const isProccessFinish = getIsProccessFinish();

    if (isProccessFinish && snapshots) {
      snapshotChart.setIsLoading(false);
      snapshotChart.setOption({
        tooltip: { trigger: 'axis' },
        legend: { data: legends.map(([key]) => key) },
        xAxis: {
          type: 'category',
          data: snapshots.map((snapshot) => snapshot.currentTime),
          name: 'Time (s)',
        },
        yAxis: { type: 'value', name: 'Loudness (LUFS)', min: 'dataMin', max: 'dataMax' },
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
        })),
      });
    }
  });

  createEffect(() => {
    const isProccessing = getIsProccessing();

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
