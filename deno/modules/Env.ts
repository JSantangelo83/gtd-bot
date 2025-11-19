import { Dotenv } from '../deps.ts';

export interface Env {
    ENCRYPTION_KEY: string;
    CREDENTIALS_FILE: string;
    POOL_CONNECTIONS: number;
}

const defaults: Env = {
    ENCRYPTION_KEY: '<change_this_for_dynamic_generated_default_key>',
    CREDENTIALS_FILE: './resources/credentials.json',
    POOL_CONNECTIONS: 10,
};

const raw = await Dotenv();

export const env: Env = {
    ENCRYPTION_KEY: raw.ENCRYPTION_KEY ?? defaults.ENCRYPTION_KEY,
    CREDENTIALS_FILE: raw.CREDENTIALS_FILE ?? defaults.CREDENTIALS_FILE,
    POOL_CONNECTIONS: Number(raw.POOL_CONNECTIONS) ?? defaults.POOL_CONNECTIONS,
};

export default env;
