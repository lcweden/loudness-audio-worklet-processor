/* @refresh reload */
import { render } from "solid-js/web";
import { App } from "./app.tsx";
import "./index.css";

const root = document.getElementById("root");

render(() => <App />, root!);
