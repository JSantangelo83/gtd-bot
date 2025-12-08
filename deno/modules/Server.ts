import { Application, Router } from "../deps.ts";
import { Logger } from "./Logger.ts";

const server = new Application();
const router = new Router();

const port = 80;

server.use(router.routes());
server.use(router.allowedMethods());

server.listen({ port });

Logger.info(`HTTP Server listening on port ${port}`);

router.get('/ping', (ctx) => { ctx.response.body = 'pong' });

export { router };