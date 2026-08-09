import raw from "../../data.json";
import { initConfig } from "./pass.js";

export const SITE_INFO = raw.site;
export const APP_CONFIG = raw.config;
export const DEFAULT_DANS = raw.dans;

initConfig(APP_CONFIG);
