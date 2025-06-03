import { Accessor, For, mergeProps, Show } from 'solid-js';
import { AudioLoudnessSnapshot, Metrics } from '../../types';
import { LoudnessMetricItem } from '../components';

type LoudnessMetricStatsProps = {
  getSnapshot: Accessor<AudioLoudnessSnapshot | undefined>;
};

function LoudnessMetricStats(loudnessMetricStatsProps: LoudnessMetricStatsProps) {
  const { getSnapshot } = mergeProps(loudnessMetricStatsProps);

  return (
    <div class="grid grid-cols-3 items-center">
      <For
        each={[
          { label: 'Loudness Range', unit: 'LRA', key: 'loudnessRange' as keyof Metrics },
          { label: 'Integrated Loudness', unit: 'LUFS', key: 'integratedLoudness' as keyof Metrics },
          { label: 'True Peak Level', unit: 'dBTP', key: 'maximumTruePeakLevel' as keyof Metrics },
        ]}
      >
        {({ label, unit, key }, index) => {
          return (
            <LoudnessMetricItem label={label} unit={unit} size={index() === 1 ? 'lg' : 'md'}>
              <Show when={getSnapshot()} fallback={'-'} keyed={true}>
                {(snapshot) => {
                  const value = snapshot.currentMetrics[0][key];
                  return value === Number.NEGATIVE_INFINITY ? '-' : value;
                }}
              </Show>
            </LoudnessMetricItem>
          );
        }}
      </For>
    </div>
  );
}

export { LoudnessMetricStats };
