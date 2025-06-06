import { JSX, mergeProps } from 'solid-js';

type LoudnessMetricItemProps = {
  children: JSX.Element;
  label: string;
  unit: string;
  size?: 'md' | 'lg';
};

function LoudnessMetricItem(loudnessMetricItemProps: LoudnessMetricItemProps) {
  const { children, label, unit, size } = mergeProps({ size: 'md' }, loudnessMetricItemProps);

  return (
    <div class="flex flex-col items-center gap-3">
      <p class="text-xs font-light sm:text-sm">{label}</p>
      <p class={size === 'md' ? 'text-xl sm:text-6xl' : 'text-5xl sm:text-8xl'}>{children}</p>
      <p class="text-xs font-light">{unit}</p>
    </div>
  );
}

export { LoudnessMetricItem };
