import "./app.css";
import { mount } from "svelte";
import App from "./App.svelte";
import { flushCustomSave, flushSaveState } from "./lib/stores.svelte.js";

window.addEventListener("beforeunload", flushCustomSave);
window.addEventListener("pagehide", flushCustomSave);
window.addEventListener("beforeunload", flushSaveState);
window.addEventListener("pagehide", flushSaveState);

const app = mount(App, { target: document.getElementById("app") });

export default app;
