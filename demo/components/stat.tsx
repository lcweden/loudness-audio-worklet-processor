import { JSX } from "solid-js";

type StatProps = {
  class?: string;
  title: string;
  description?: string;
  value?: JSX.Element;
  centered?: boolean;
};

function Stat(props: StatProps) {
  return (
    <div class={`stats ${props.class}`}>
      <div
        class="stat"
        classList={{
          "place-items-center": props.centered
        }}
      >
        <div class="stat-title">{props.title}</div>
        <div class="stat-value font-light">{props.value}</div>
        <div class="stat-desc">{props.description}</div>
      </div>
    </div>
  );
}

export { Stat };
