import { Application, Router } from "../deps.ts";
import { Logger } from "./Logger.ts";

const server = new Application();
const router = new Router();

const port = 80;

server.use(router.routes());
server.use(router.allowedMethods());

Logger.info(`HTTP Server listening on port ${port}`);

const registeredRoutes: { method: string; path: string }[] = [];

// Intercept every router.METHOD(...)
function patchRouter(router: Router) {
  const methods = ["get", "post", "put", "patch", "delete", "options", "all"] as const;

  for (const m of methods) {
    const original = (router as any)[m];

    (router as any)[m] = function (path: string, ...handlers: any[]) {
      registeredRoutes.push({ method: m.toUpperCase(), path });

      Logger.info(`Route added: ${m.toUpperCase()} ${path}`);

      return original.call(this, path, ...handlers);
    };
  }
}

patchRouter(router);

router.get('/ping', (ctx) => { ctx.response.body = 'pong' });

server.listen({ port });

export { router, server };