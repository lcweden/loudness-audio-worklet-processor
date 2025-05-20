import { mergeProps } from 'solid-js';

type StatItemProps = {
  title: string;
  value: string | number;
  desc: string;
};

function StatItem(statItemProps: StatItemProps) {
  const props = mergeProps(statItemProps);

  return (
    <div class="card card-border flex w-full flex-col items-center justify-center p-4 shadow">
      <div class="stat-title">{props.title}</div>
      <div class="stat-value select-text">{props.value}</div>
      <div class="stat-desc">{props.desc}</div>
    </div>
  );
}

export { StatItem };
