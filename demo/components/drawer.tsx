import { createUniqueId, JSX } from "solid-js";

type DrawerProps = {
  children?: JSX.Element;
  sidebar?: JSX.Element;
};

type DrawerToggleProps = {
  children?: JSX.Element;
  class?: string;
};

const id = createUniqueId();

function Drawer(props: DrawerProps) {
  return (
    <div class="drawer lg:drawer-open">
      <input id={id} type="checkbox" class="drawer-toggle" />
      <section class="drawer-content" style={{ "scrollbar-gutter": "stable" }}>
        {props.children}
      </section>
      <section class="drawer-side" style={{ "scrollbar-gutter": "stable" }}>
        <label for={id} aria-label="close sidebar" class="drawer-overlay"></label>
        {props.sidebar}
      </section>
    </div>
  );
}

function DrawerToggle(props: DrawerToggleProps) {
  return (
    <label for={id} class={`drawer-button lg:hidden ${props.class}`}>
      {props.children}
    </label>
  );
}

export { Drawer, DrawerToggle };
