import { PostgresPool } from "../../deps.ts";
import env from "../Env.ts";
import { BaseNode, BaseNodeParams } from "./BaseNode.ts";

export interface PostgresCredData {
  host: string;
  database: string;
  user: string;
  password: string;
  port: number;
}

export interface PostgresParams extends BaseNodeParams<PostgresCredData> {

}

export class Postgres extends BaseNode<PostgresCredData> {
  private pool!: PostgresPool
  constructor(private params: PostgresParams) {
    super()
    this.pool = new PostgresPool(
      {
        user: params.cred.data.user,
        database: params.cred.data.database,
        hostname: params.cred.data.host,
        port: params.cred.data.port,
        password: params.cred.data.password
      },
      env.POOL_CONNECTIONS,
    );
  }

  static create(params: PostgresParams): Promise<Postgres> {
    return BaseNode.factory(Postgres, params);
  }

  override async healthCheck(): Promise<void> {
    {
      using client = await this.pool.connect();
      await client.queryObject`SELECT 1`
    }
  }

  async getVersion(): Promise<string> {
    {
      using client = await this.pool.connect();
      return (await client.queryArray<string[]>`SELECT version()`).rows[0][0]
    }
  }

  async getTelegramChatsIds(): Promise<number[]> {
    {
      using client = await this.pool.connect();
      return (await client.queryArray<number[]>`SELECT telegram_chat_id FROM chats`).rows.flat()
    }
  }

  async getTasks(telegramChatId: number): Promise<Task[]> {
    {
      using client = await this.pool.connect();
      return (await client.queryObject<Task>`SELECT id,title,description FROM tasks WHERE telegram_chat_id = ${telegramChatId}`).rows
    }
  }
}

export type Task = {
  id: string,
  title: string,
  description: string,
  list_id?: string
}