import { Credential, DecryptedCredential } from "./modules/Credential.ts";
import env from "./modules/Env.ts";
import { Logger } from "./modules/Logger.ts";
import { Postgres, PostgresCredData } from "./modules/Postgres.ts";

const creds_file = env.CREDENTIALS_FILE
const key = env.ENCRYPTION_KEY
const credManager = await Credential.fromKey(key);

Logger.info('Importing credentials...')
const raw = JSON.parse(await Deno.readTextFile(creds_file));
await credManager.import(raw);
const psCreds = credManager.getByName('postgres')
if(psCreds){
    const ps = new Postgres(psCreds as DecryptedCredential<PostgresCredData>)
    console.log(await ps.testQuery())
}
