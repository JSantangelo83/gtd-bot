import { TelegramUpdate } from "../../deps.ts";
import env from "../Env.ts";
import { Logger } from "../Logger.ts";
import { BaseNode, BaseNodeParams } from "./BaseNode.ts";

export interface TelegramCredData {
    accessToken: string;
}

export interface TelegramParams extends BaseNodeParams<TelegramCredData> { }

export class Telegram extends BaseNode<TelegramCredData> {
    private apiBase = "";
    private token = "";
    private webhookCallbacks: WebhookCallback[] = [];

    constructor(private params: TelegramParams) {
        super();
        this.token = params.cred.data.accessToken;
        this.apiBase = `https://api.telegram.org/bot${this.token}`;
    }

    static create(params: TelegramParams): Promise<Telegram> {
        return BaseNode.factory(Telegram, params);
    }

    override async healthCheck(): Promise<void> {
        const res = await fetch(`${this.apiBase}/getMe`);
        if (!res.ok) throw new Error(`Status ${res.status}`);
    }

    private async registerWebhook(): Promise<void> {
        Deno.serve({
            port: 80,
            hostname: '0.0.0.0',
            onListen: () => Logger.info('Listening for Telegram updates...')
        }, async (req) => {
            const update = (await req.json()) as TelegramUpdate;
            this.emit(update);
            return new Response("ok");
        });
        Logger.info(`Registering '${env.WEBHOOK_URL}' as Telegram webhook`)
        const res = await fetch(`${this.apiBase}/setWebhook`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ url: env.WEBHOOK_URL }),
        });

        if (!res.ok) throw new Error(`Could not register webhook (${res.status}): ${await res.text()}`);
        Logger.info('Registered Telegram Webhook')
    }

    private emit(update: TelegramUpdate) {
        for (const { callback } of this.webhookCallbacks) {
            callback(update);
        }
    }

    async addWebhookCallback(webhookCallback: WebhookCallback): Promise<void> {
        if (!this.webhookCallbacks.length) await this.registerWebhook();

        Logger.info(`Adding '${webhookCallback.name}' Telegram webhook callback`)
        this.webhookCallbacks.push(webhookCallback);
    }

    removeWebhookCallback(name: string): void {
        this.webhookCallbacks = this.webhookCallbacks.filter(
            (cb: WebhookCallback) => cb.name !== name
        );
    }

    async sendMessage(chatId: number | string, text: string): Promise<void> {
        const res = await fetch(`${this.apiBase}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
            }),
        });
    
        if (!res.ok) {
            throw new Error(`Telegram sendMessage failed (${res.status}): ${await res.text()}`);
        }
    }
    
}

export interface WebhookCallback {
    name: string;
    callback: (update: TelegramUpdate) => void;
}