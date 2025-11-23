import { Dotenv } from '../deps.ts';

export interface Env {
    ENCRYPTION_SECRET: string;
    CREDENTIALS_FILE: string;
    POOL_CONNECTIONS: number;
    WEBHOOK_URL: string;
    WEBHOOK_URL_PROVIDER: string;
}

const defaults: Env = {
    ENCRYPTION_SECRET: '<change_this_for_dynamic_generated_default_key>',
    CREDENTIALS_FILE: './resources/credentials.json',
    POOL_CONNECTIONS: 10,
    WEBHOOK_URL: '',
    WEBHOOK_URL_PROVIDER: ''
};

const raw = await Dotenv();

validate(raw, defaults)

export const env: Env = {
    ENCRYPTION_SECRET: raw.ENCRYPTION_SECRET ?? defaults.ENCRYPTION_SECRET,
    CREDENTIALS_FILE: raw.CREDENTIALS_FILE ?? defaults.CREDENTIALS_FILE,
    POOL_CONNECTIONS: Number(raw.POOL_CONNECTIONS) || defaults.POOL_CONNECTIONS,
    WEBHOOK_URL: raw.WEBHOOK_URL || ((raw.WEBHOOK_URL_PROVIDER || defaults.WEBHOOK_URL_PROVIDER) ? await (await fetch(`${raw.WEBHOOK_URL_PROVIDER}/url`)).text() : defaults.WEBHOOK_URL),
    WEBHOOK_URL_PROVIDER: raw.WEBHOOK_URL_PROVIDER ?? defaults.WEBHOOK_URL_PROVIDER
};

export default env;

function validate(raw: Record<string, string>, defaults: Env): void {
    if (!raw.WEBHOOK_URL && !raw.WEBHOOK_URL_PROVIDER && !defaults.WEBHOOK_URL && !defaults.WEBHOOK_URL_PROVIDER)
        throw new Error('\`WEBHOOK_URL\` or \`WEBHOOK_URL_PROVIDER\` must be specified in some place')
}
