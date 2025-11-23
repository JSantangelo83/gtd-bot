import { BaseNode, BaseNodeParams } from "./BaseNode.ts";

export interface OpenAiCredData {
    apiKey: string;
    baseURL?: string;
    defaultModel?: string;
}

export interface OpenAiParams extends BaseNodeParams<OpenAiCredData> {

}

export class OpenAi extends BaseNode<OpenAiCredData> {
    private baseUrl: string = '';
    private model: string = '';
    private apiKey: string = '';

    constructor(private params: OpenAiParams) {
        super();
        this.baseUrl = params.cred.data.baseURL ?? "https://api.openai.com/v1";
        this.model = params.cred.data.defaultModel ?? "gpt-4.1-mini";
        this.apiKey = params.cred.data.apiKey // Just for easier access
    }

    static create(params: OpenAiParams): Promise<OpenAi> {
        return BaseNode.factory(OpenAi, params);
    }

    override async healthCheck(): Promise<void> {
        try {
            const res = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }

        } catch (err: unknown) {
            throw err
        }
    }

    public async messageAModel(
        prompt: string,
        jsonSchemaOutput?: JSONSchemaOutput
    ): Promise<MessageAModelResult> {
        const body: Record<string, unknown> = {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
        };

        if (jsonSchemaOutput) {
            body.response_format = {
                type: "json_schema",
                json_schema: jsonSchemaOutput,
            };
        }

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            throw new Error(`OpenAI Error (${res.status}): ${await res.text()}`);
        }

        const data = await res.json();
        return jsonSchemaOutput
            ? { response: JSON.parse(data.choices?.[0]?.message?.content ?? "null") }
            : { response: data.choices?.[0]?.message?.content ?? null };
    }

}

export interface JSONSchemaOutput {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
}

export interface MessageAModelResult {
    response: string | unknown, //TODO: improve typing
}