import "./app.css";
import { mount } from "svelte";
import AdminApp from "./AdminApp.svelte";
import { flushCustomSave } from "./lib/stores.svelte.js";

window.addEventListener("beforeunload", flushCustomSave);
window.addEventListener("pagehide", flushCustomSave);

const app = mount(AdminApp, { target: document.getElementById("app") });

export default app;
