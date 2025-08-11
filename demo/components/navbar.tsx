import { JSX } from "solid-js";

type NavbarProps = {
  class?: string;
  start?: JSX.Element;
  center?: JSX.Element;
  end?: JSX.Element;
};

function Navbar(props: NavbarProps) {
  return (
    <div class={`navbar ${props.class}`}>
      <div class="navbar-start">{props.start}</div>
      <div class="navbar-center">{props.center}</div>
      <div class="navbar-end">{props.end}</div>
    </div>
  );
}

export { Navbar };
