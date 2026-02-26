import { TelegramUpdate } from "./deps.ts";
import { Credential } from "./modules/Credential.ts";
import env from "./modules/Env.ts";
import { GoogleCalendar, GoogleCalendarCredData } from "./modules/nodes/GoogleCalendar.ts";
import { OpenAi, OpenAiCredData } from "./modules/nodes/OpenAI.ts";
import { Postgres, PostgresCredData } from "./modules/nodes/Postgres.ts";
import { MsgUnauthorized, Telegram, TelegramCredData } from "./modules/nodes/Telegram.ts";

const secret = env.ENCRYPTION_SECRET
const creds_file = env.CREDENTIALS_FILE

const credManager = await Credential.create(secret, creds_file);

const telegramCred = credManager.getByName<TelegramCredData>('telegram')
if (!telegramCred) throw new Error("No Telegram credentials have been found")
const telegram = await Telegram.create({ name: 'Telegram', cred: telegramCred })

const gCalendarCred = credManager.getByName<GoogleCalendarCredData>('js-calendar')
if (!gCalendarCred) throw new Error("No Google Calendar credentials have been found")
const gcalendar = await GoogleCalendar.create({ name: 'Calendar', cred: gCalendarCred, credManager: credManager })

const postgresCred = credManager.getByName<PostgresCredData>('postgres')
if (!postgresCred) throw new Error("No Postgres credentials have been found")
const postgres = await Postgres.create({ name: 'Postgres', cred: postgresCred })

const openAiCred = credManager.getByName<OpenAiCredData>('js-openai')
if (!openAiCred) throw new Error("No OpenAi credentials have been found")
const openAi = await OpenAi.create({ name: 'OpenAI', cred: openAiCred })

// Bot logic
const onMessage = async (update: TelegramUpdate) => {
    if (!update.message) return; //Only handle 'message' type updates

    const chatId = update.message?.chat.id?.toString()
    if (!chatId) return; //Probably not needed

    const validIds = await postgres.getTelegramChatsIds()
    
    // Si el id esta whitelisteado
    if (!validIds.find(id => id === chatId)) {
        telegram.sendMessage(chatId, MsgUnauthorized)
        return;
    }
    // Si es un mensaje de texto
    if (!update.message.text) {
        telegram.sendMessage(chatId, 'Only text messages are supported by now');
        return;
    }
    const msgText = update.message.text

    if (msgText.startsWith('/')) return handleCommand(update);

    const extracted = await openAi.extractTaskData(msgText)

    const tasks = await postgres.getTasks(chatId)

    // Si hay tareas, busco duplicados
    if (tasks.length) {
        const duplicated = await openAi.getDuplicatedTask(extracted, tasks)
        if (duplicated && duplicated.id) {
            if (!extracted.date) {
                telegram.sendMessage(chatId, `This task already exists in your task list. (${duplicated.title} - ${duplicated.description})`);
                return;
            }

            postgres.deleteTask(duplicated.id.toString())
            console.log('scheduling to calendar:', extracted)
            gcalendar.scheduleEvent({
                start: extracted.date,
                end: extracted.date,
                title: extracted.title as string,
                description: extracted.description as string,
                rrule: extracted.rrule
            })

            telegram.sendMessage(chatId, `Existing task moved to your Google Calendar. (${duplicated.title} - ${duplicated.description})`);
            return;
        }
    }

    await postgres.createTask({
        telegramChatId: chatId,
        title: extracted.title as string,
        description: extracted.description as string,
    })
    
    telegram.sendMessage(chatId.toString(), `New task added: ${extracted.title} - ${extracted.description}`);
}

const handleCommand = async (update: TelegramUpdate) => {
    const chatId = update.message?.chat.id?.toString()
    if (!chatId) return; //Probably not needed

    const msgText = update.message?.text

    if (msgText === '/list') {
        const tasks = await postgres.getTasks(chatId)
        if (!tasks.length) {
            telegram.sendMessage(chatId!.toString(), 'You have no tasks saved.')
            return;
        }
        let reply = 'Your tasks:\n\n'
        tasks.forEach((task, index) => {
            reply += `${index + 1}. ${task.title} - ${task.description}\n`
        })
        telegram.sendMessage(chatId!.toString(), reply)
        return; 
    }
}

telegram.addWebhookCallback({
    name: 'main',
    callback: onMessage
})

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