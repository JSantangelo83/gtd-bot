import { Pool } from "@db/postgres";
import { PostgresPool } from "../deps.ts";
import { DecryptedCredential } from "./Credential.ts";
import env from "./Env.ts";
import { BaseNode, BaseNodeParams } from "./nodes/BaseNode.ts";

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

  async getVersion(): Promise<GetVersionResult> {
    {
      using client = await this.pool.connect();
      return (await client.queryObject<GetVersionResult>`SELECT version()`).rows[0]
    }
  }

}

export interface GetVersionResult {
  version: string
}