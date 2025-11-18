// env.ts
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

export interface Env {
    ENCRYPTION_KEY: string;
    CREDENTIALS_FILE: string;
}

const defaults: Env = {
    ENCRYPTION_KEY: "<change_this_for_dynamic_generated_default_key>",
    CREDENTIALS_FILE: "./resources/credentials.json",
};

const raw = await load();

export const env: Env = {
    ENCRYPTION_KEY: raw.ENCRYPTION_KEY ?? defaults.ENCRYPTION_KEY,
    CREDENTIALS_FILE: raw.CREDENTIALS_FILE ?? defaults.CREDENTIALS_FILE,
};

export default env;
