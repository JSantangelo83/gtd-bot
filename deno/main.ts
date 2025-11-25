import { TelegramUpdate } from "./deps.ts";
import { Credential } from "./modules/Credential.ts";
import env from "./modules/Env.ts";
import { Logger } from "./modules/Logger.ts";
import { GoogleCalendar, GoogleCalendarCredData } from "./modules/nodes/GoogleCalendar.ts";
import { OpenAi, OpenAiCredData } from "./modules/nodes/OpenAI.ts";
import { Postgres, PostgresCredData } from "./modules/nodes/Postgres.ts";
import { Telegram, TelegramCredData } from "./modules/nodes/Telegram.ts";

const creds_file = env.CREDENTIALS_FILE
const secret = env.ENCRYPTION_SECRET
const credManager = await Credential.create(secret);

Logger.info('Importing credentials...')
const raw = JSON.parse(await Deno.readTextFile(creds_file));
await credManager.import(raw);

const telegramCred = credManager.getByName<TelegramCredData>('telegram')
if (!telegramCred) throw new Error("No Telegram credentials have been found")
const telegram = await Telegram.create({ name: 'Telegram', cred: telegramCred })

const gCalendarCred = credManager.getByName<GoogleCalendarCredData>('js-calendar')
if (!gCalendarCred) throw new Error("No Google Calendar credentials have been found")
const gcalendar = await GoogleCalendar.create({ name: 'calendar', cred: gCalendarCred })

const postgresCred = credManager.getByName<PostgresCredData>('postgres')
if (!postgresCred) throw new Error("No Postgres credentials have been found")
const postgres = await Postgres.create({ name: 'postgres', cred: postgresCred })

const openAiCred = credManager.getByName<OpenAiCredData>('js-openai')
if (!openAiCred) throw new Error("No OpenAi credentials have been found")
const openAi = await OpenAi.create({ name: 'openai', cred: openAiCred })

// Bot logic
const onMessage = async (update: TelegramUpdate) => {
    const chatId = update.message?.chat.id
    if (!chatId) return; //Probably not needed
    console.log(chatId)
    console.log(await postgres.getTelegramChatsIds())

}

telegram.addWebhookCallback({
    name: 'main',
    callback: onMessage
})