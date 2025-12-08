import { Helper } from "../Helper.ts";
import { BaseNode, BaseNodeParams } from "./BaseNode.ts";
import { SavedTask } from "./Postgres.ts";

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

    private async message<T>(prompt: string, responseFormat?: OpenAIResponseFormat): Promise<T> {
        const body: Record<string, unknown> = {
            model: this.model,
            messages: [{ role: "user", content: prompt }],
        };

        if (responseFormat) body.response_format = responseFormat

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error(`OpenAI Error (${res.status}): ${await res.text()}`);


        const data = (await res.json()).choices?.[0]?.message?.content;

        return (responseFormat ? JSON.parse(data) : res) as T

    }

    public extractTaskData(msg: string): Promise<ExtractTaskDataResult> {
        return this.message<ExtractTaskDataResult>(`
            Extract structured information from the user's input according to the given JSON schema.
            Follow these rules:
            - Interpret “de 9 a 18” as start=09:00, duration=9.
            - If no time or repetition is given, leave those fields null.
            - Summarize the title briefly, describe the task in one short phrase.
            - When a date is relative (e.g., “martes”, “mañana”, “el viernes”), compute the next occurrence of that day from today’s date (assume today is ${Helper.now()}). If no date is mentioned, leave it null.
            - Expand (A LITTLE) on the description without repeating info
            - If no duration, fill it with 1 as default

            This is the User input:
            ${msg}
        `, {
            type: "json_schema",
            json_schema: {
                name: 'Task',
                description: "The task that we're handling",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        date: {
                            type: ["string", "null"],
                            description: "Start date of the task in YYYY-MM-DD format. If relative (e.g. 'martes'), use the next occurrence from today's date."
                        },
                        time: {
                            type: ["string", "null"],
                            description: "24-hour formatH:mm, or null if none"
                        },
                        title: {
                            type: "string",
                            description: "Short summary of the task"
                        },
                        description: {
                            type: "string",
                            description: "Brief description of what will be done. Must not contain time or date expressions such as 'mañana', 'por la tarde', 'cada', 'semana', day names, or recurrence words"
                        },
                        rrule: {
                            type: ["string", "null"],
                            description: "RFC 5545 RRULE or null if not repeating"
                        },
                        duration: {
                            type: ["number", "null"],
                            description: "Duration in hours or null if unknown"
                        }
                    },
                    required: ["date", "time", "title", "description", "rrule", "duration"],
                    additionalProperties: false
                }
            }
        })
    }

    public getDuplicatedTask(newTask: ExtractTaskDataResult, taskList: SavedTask[]): Promise<GetDuplicatedTaskResult> {
        return this.message<GetDuplicatedTaskResult>(`
            You are a duplicate checker. Given a new task and a list of existing tasks determine if any existing task refers to the same thing. (based only on title and description)
            Task list: ${taskList}
            New Task: ${newTask}

            Return only JSON that conforms exactly to the schema.
        `, {
            type: "json_schema",
            json_schema: {
                name: 'Task',
                description: "The duplicated schema",
                strict: true,
                schema: {
                    type: "object",
                    properties: {
                        id: { type: ["number", "null"] },
                        title: { type: ["string", "null"] },
                        description: { type: ["string", "null"] },
                    },
                    required: ["id", "title", "description"],
                    additionalProperties: false
                }
            }
        });
    }
}
export interface ExtractTaskDataResult {
    title: string;
    description: string;
    date?: string;
    time?: string;
    rrule?: string;
    duration?: number;
}

export interface GetDuplicatedTaskResult {
    id?: number;
    title?: string;
    description?: string;
}
export interface OpenAIResponseFormat {
    type: "json_schema";
    json_schema: {
        name: string;               // REQUIRED by OpenAI
        description?: string;
        strict?: boolean;           // strongly recommended
        schema: OpenAIJsonSchema;   // your actual schema
    };
}
export type OpenAIScalarType =
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "object"
    | "array"
    | "null";

export interface OpenAIJsonSchema {
    type: "object";
    properties: Record<string, OpenAISchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
}

export interface OpenAISchemaProperty {
    type: OpenAIScalarType | OpenAIScalarType[];
    description?: string;
    enum?: Array<string | number | boolean>;
    format?: string;
    properties?: Record<string, OpenAISchemaProperty>;
    required?: string[];
    additionalProperties?: boolean;
    items?: OpenAISchemaProperty;
}
