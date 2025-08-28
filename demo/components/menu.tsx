import { Accessor, For, JSX } from "solid-js";

type MenuProps<T> = {
  iterable: Iterable<T> | ArrayLike<T> | false | null | undefined;
  class?: string;
  title?: JSX.Element;
  fallback?: JSX.Element;
  children: (item: T, index: Accessor<number>) => JSX.Element;
};

function Menu<T>(props: MenuProps<T>) {
  return (
    <ul class={`menu m-0 p-0 ${props.class}`}>
      {props.title}
      <For each={props.iterable ? Array.from(props.iterable) : props.iterable} fallback={props.fallback}>
        {(item, index) => <li>{props.children(item, index)}</li>}
      </For>
    </ul>
  );
}

export { Menu };
