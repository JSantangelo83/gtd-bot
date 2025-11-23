import { Credential } from "./Credential.ts";
import env, { Env } from "./Env.ts";
import { GoogleCalendar } from "./nodes/GoogleCalendar.ts";
import { Logger } from "./Logger.ts";
import { JSONSchemaOutput, OpenAi, OpenAiCredData } from "./nodes/OpenAI.ts";
import { Postgres, PostgresCredData } from "./nodes/Postgres.ts";
import { GoogleCalendarCredData } from "./nodes/GoogleCalendar.ts"

export async function testCredentials(env: Env) {
    const creds_file = env.CREDENTIALS_FILE
    const key = env.ENCRYPTION_SECRET
    const credManager = await Credential.create(key);

    Logger.info('Importing credentials...')
    const raw = JSON.parse(await Deno.readTextFile(creds_file));
    await credManager.import(raw);

    console.log(credManager.getAll())
}

export async function testCalendar(credManager: Credential) {
    const calendarCred = credManager.getByName<GoogleCalendarCredData>('js-calendar')
    if (!calendarCred) {
        Logger.error('No Calendar creds found')
        Deno.exit()
    }

    const gc = await GoogleCalendar.create({ name: 'Calendar Test', cred: calendarCred });

    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    // Example RRULE → Every Tuesday and Thursday for 10 occurrences
    const rrule = "RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10";

    console.log(await gc.scheduleEvent({
        title: "Full Test Event",
        description: "This is a complete test event with recurrence, reminders, attendees, etc.",
        rrule,
        start: now.toISOString(),
        end: inOneHour.toISOString(),
    }))
}

export async function testPostgres(credManager: Credential) {
    const psCreds = credManager.getByName<PostgresCredData>('postgres')
    if (psCreds) {
        const ps = await Postgres.create({ name: 'Postgres Test', cred: psCreds })
        console.log(await ps.getVersion())
    }

}

export async function testOpenAi(credManager: Credential) {
    const openAICred = credManager.getByName<OpenAiCredData>('js-openai')
    if (!openAICred) {
        Logger.error('No OpenAI creds found')
        Deno.exit()
    }

    const oai = await OpenAi.create({ name: 'Test Open AI', cred: openAICred });

    const schema: JSONSchemaOutput = {
        name: "Echo",
        schema: {
            type: "object",
            properties: {
                answer: { type: "string" }
            },
            required: ["answer"],
        }
    };


    const res = await oai.messageAModel('Give me any string in the "answer" field.', schema)
    console.log(res)
}


import { Telegram, TelegramCredData } from "./nodes/Telegram.ts";
import { TelegramUpdate } from "../deps.ts";

export async function testTelegram(credManager: Credential) {
    const tgCred = credManager.getByName<TelegramCredData>('telegram');
    if (!tgCred) {
        Logger.error("No Telegram creds found");
        Deno.exit();
    }

    const tg = await Telegram.create({
        name: "Telegram Test",
        cred: tgCred,
    });

    const webhookCallback = {
        name: 'Testing webhook',
        callback: (update: TelegramUpdate) => {
            const msg = update?.message?.text;
            if (msg) Logger.info(`📩 Incoming Telegram Update: '${msg}'`);
        } 
    }

    await tg.addWebhookCallback(webhookCallback);
}
