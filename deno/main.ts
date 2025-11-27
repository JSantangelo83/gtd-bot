import { TelegramUpdate } from "./deps.ts";
import { Credential } from "./modules/Credential.ts";
import env from "./modules/Env.ts";
import { Logger } from "./modules/Logger.ts";
import { GoogleCalendar, GoogleCalendarCredData } from "./modules/nodes/GoogleCalendar.ts";
import { OpenAi, OpenAiCredData } from "./modules/nodes/OpenAI.ts";
import { Postgres, PostgresCredData } from "./modules/nodes/Postgres.ts";
import { MsgUnauthorized, Telegram, TelegramCredData } from "./modules/nodes/Telegram.ts";

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
    console.log(update)
    if (!update.message) return; //Only handle 'message' type updates

    const chatId = update.message?.chat.id
    if (!chatId) return; //Probably not needed

    const validIds = await postgres.getTelegramChatsIds()
    console.log(validIds, chatId)
    // Si el id esta whitelisteado
    if (!validIds.find(id => id === chatId)) {
        telegram.sendMessage(chatId.toString(), MsgUnauthorized)
        return;
    }
    // Si es un mensaje de texto
    if (!update.message.text) {
        telegram.sendMessage(chatId.toString(), 'Only text messages are supported by now');
        return;
    }
    const msgText = update.message.text

    const extracted = await openAi.extractTaskData(msgText)

    const tasks = await postgres.getTasks(chatId)

    const duplicated = openAi.getDuplicatedTask(extracted, tasks)
    // Si hay tareas, busco duplicados
    if (tasks.length) {

    }
}

// telegram.addWebhookCallback({
//     name: 'main',
//     callback: onMessage
// })

onMessage({
    update_id: 135214039,
    message: {
        message_id: 426,
        from: {
            id: 7258342357,
            is_bot: false,
            first_name: "Joakin",
            language_code: "en"
        },
        chat: { id: 7258342357, first_name: "Joakin", type: "private" },
        date: 1764093076,
        text: "Tengo que ir a comprar una birome"
    }
})