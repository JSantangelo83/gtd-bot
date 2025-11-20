import { Credential } from "./modules/Credential.ts";
import env from "./modules/Env.ts";
import { Logger } from "./modules/Logger.ts";
// import { testCalendar, testOpenAi, testPostgres } from "./modules/Test.ts";

const creds_file = env.CREDENTIALS_FILE
const secret = env.ENCRYPTION_SECRET
const credManager = await Credential.create(secret);

Logger.info('Importing credentials...')
const raw = JSON.parse(await Deno.readTextFile(creds_file));
await credManager.import(raw);

// await testOpenAi(credManager)
// await testPostgres(credManager)
// await testCalendar(credManager)
