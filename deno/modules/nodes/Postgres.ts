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
  constructor(params: PostgresParams) {
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

  async getTelegramChatsIds(): Promise<string[]> {
    {
      using client = await this.pool.connect();
      return (await client.queryArray<string[]>`SELECT telegram_chat_id FROM chats`).rows.flat()
    }
  }

  async getTasks(telegramChatId: string): Promise<SavedTask[]> {
    {
      using client = await this.pool.connect();
      return (await client.queryObject<SavedTask>`SELECT t.id, t.title, t.description FROM tasks t LEFT JOIN chats c on c.id = t.chat_id WHERE c.telegram_chat_id = ${telegramChatId}`).rows
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    {
      using client = await this.pool.connect();
      await client.queryObject`DELETE FROM tasks WHERE id = ${taskId}`
    }
  }

  async createTask(task: NewTask): Promise<void> {
    {
      using client = await this.pool.connect();
      const chatId = await client.queryObject<{ id: string }>`SELECT id FROM chats WHERE telegram_chat_id = ${task.telegramChatId}`
      await client.queryObject<{ id: string }>`INSERT INTO tasks (chat_id, title, description, list_id) VALUES (${chatId}, ${task.title}, ${task.description}, ${task.listId})`
    }
  }
}

export type NewTask = {
  telegramChatId: string,
  title: string,
  description: string,
  listId?: string
}

export type SavedTask = {
  id: string,
  title: string,
  description: string,
  list_id?: string
}