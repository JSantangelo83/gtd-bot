import { PostgresPool } from "../deps.ts";
import { DecryptedCredential } from "./Credential.ts";
import env from "./Env.ts";

export interface PostgresCredData {
  host: string;
  database: string;
  user: string;
  password: string;
  port: number;
}

export class Postgres {
  private pool: PostgresPool
  constructor(cred: DecryptedCredential<PostgresCredData>) {
    this.pool = new PostgresPool(
      {
        user: cred.data.user,
        database: cred.data.database,
        hostname: cred.data.host,
        port: cred.data.port,
        password: cred.data.password
      },
      env.POOL_CONNECTIONS,
    );
  }

  public async testQuery(): Promise<TestQueryResult> {
    {
      using client = await this.pool.connect();
      console.log(client)
      const ret = (await client.queryObject<TestQueryResult>`SELECT version()`).rows[0];
      return ret;
    }
  }
}

export interface TestQueryResult {
  version: string
}