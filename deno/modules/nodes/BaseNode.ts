import { DecryptedCredential } from "../Credential.ts";
import { Logger } from "../Logger.ts";

export interface BaseNodeParams<T> {
    cred: DecryptedCredential<T>;
    name: string
}

export abstract class BaseNode<T> {
    abstract healthCheck(): Promise<void>;

    static async factory<
        U extends BaseNode<unknown>,
        P extends BaseNodeParams<unknown>
    >(
        ctor: new (params: P) => U,
        params: P
    ): Promise<U> {
        const instance = new ctor(params);
        try {
            await instance.healthCheck();
            Logger.info(`✅ ${params.name} Node is ready to use`);
        } catch (err) {
            Logger.error(`❌ ${params.name} Node could not start\nError details:\n${err}`);
            throw err;
        }
        return instance;
    }
}