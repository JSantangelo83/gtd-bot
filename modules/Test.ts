import { Credential } from "./Credential.ts";
import { Env } from "./Env.ts";
import { GoogleCalendar } from "./GoogleCalendar.ts";
import { Logger } from "./Logger.ts";
import { JSONSchemaOutput, OpenAi } from "./OpenAI.ts";

export async function testCredentials(env: Env) {
    const creds_file = env.CREDENTIALS_FILE
    const key = env.ENCRYPTION_KEY
    const credManager = await Credential.fromKey(key);

    Logger.info('Importing credentials...')
    const raw = JSON.parse(await Deno.readTextFile(creds_file));
    await credManager.import(raw);

    console.log(credManager.getAll())
}

export async function testCalendar(credManager: Credential) {
    const calendarCred = credManager.getByName('js-calendar')
    if (!calendarCred) {
        Logger.error('No Calendar creds found')
        Deno.exit()
    }

    const gc = new GoogleCalendar(calendarCred);

    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);

    // Example RRULE → Every Tuesday and Thursday for 10 occurrences
    const rrule = "RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10";

    gc.scheduleEvent({
        title: "Full Test Event",
        description: "This is a complete test event with recurrence, reminders, attendees, etc.",
        rrule,
        start: now.toISOString(),
        end: inOneHour.toISOString(),
    });

}

export async function testOpenAi(credManager: Credential) {
    const openAICred = credManager.getByName('js-openai')
    if (!openAICred) {
        Logger.error('No OpenAI creds found')
        Deno.exit()
    }

    const oai = new OpenAi(openAICred);

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
