import { DecryptedCredential } from "./Credential.ts";

export interface OpenAiCredData {
    apiKey: string;
    baseURL?: string;
    defaultModel?: string;
}

export interface JSONSchemaOutput {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
}

export class OpenAi {
    private apiKey: string;
    private baseURL: string;
    private model: string;

    constructor(cred: DecryptedCredential) {
        const parsed: OpenAiCredData = JSON.parse(cred.data);

        this.apiKey = parsed.apiKey;
        this.baseURL = parsed.baseURL ?? "https://api.openai.com/v1";
        this.model = parsed.defaultModel ?? "gpt-4.1-mini";
    }

public async messageAModel(
    prompt: string,
    jsonSchemaOutput?: JSONSchemaOutput
): Promise<unknown> {
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

    const res = await fetch(`${this.baseURL}/chat/completions`, {
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
        ? JSON.parse(data.choices?.[0]?.message?.content ?? "null")
        : data.choices?.[0]?.message?.content ?? null;

}

}
