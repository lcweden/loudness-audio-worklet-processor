import { Accessor, For, JSX, Show } from "solid-js";

type MenuProps<T> = {
  iterable: Iterable<T> | ArrayLike<T> | false | null | undefined;
  class?: string;
  title?: string;
  fallback?: JSX.Element;
  children: (item: T, index: Accessor<number>) => JSX.Element;
};

function Menu<T>(props: MenuProps<T>) {
  return (
    <ul class={`menu ${props.class}`}>
      <Show when={props.title}>
        <li class="text-base-content/60 p-4 pb-2 text-xs tracking-wide">{props.title}</li>
      </Show>

      <For each={props.iterable ? Array.from(props.iterable) : props.iterable} fallback={props.fallback}>
        {(item, index) => <li>{props.children(item, index)}</li>}
      </For>
    </ul>
  );
}

export { Menu };
