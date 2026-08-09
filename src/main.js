import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { flushCustomSave } from "./lib/stores.svelte.js";

window.addEventListener("beforeunload", flushCustomSave);
window.addEventListener("pagehide", flushCustomSave);

const app = mount(App, { target: document.getElementById("app") });

export default app;
