#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net
import { Credential } from "../modules/Credential.ts";
import { GoogleCalendarCredData } from "../modules/nodes/GoogleCalendar.ts";
import { Application, Dotenv, Router } from "../deps.ts";

const env = await Dotenv({
  envPath: new URL("../.env", import.meta.url).pathname,
});

const creds_file = './resources/credentials.json'
const secret = env.ENCRYPTION_SECRET;
const port = 3000;
const redirectUri = `http://localhost:${port}/callback`;

const credManager = await Credential.create(secret, creds_file);
const server = new Application();
const router = new Router();

const gCalendarCred = credManager.getByName<GoogleCalendarCredData>('js-calendar');
if (!gCalendarCred) throw new Error("No Google Calendar credentials have been found");
const data = gCalendarCred.data;

const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

oauthUrl.searchParams.set("client_id", data.clientId);
oauthUrl.searchParams.set("redirect_uri", redirectUri);
oauthUrl.searchParams.set("response_type", "code");
oauthUrl.searchParams.set("access_type", "offline");
oauthUrl.searchParams.set("prompt", "consent");
oauthUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar");

console.log("Open the following URL to re-authorize Google Calendar:");
console.log(oauthUrl.toString());

server.use(router.routes());
server.use(router.allowedMethods());
server.listen({ port });

const code = await waitForOAuthCode(router);

console.log("Received auth code:", code);

const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
        code,
        client_id: data.clientId,
        client_secret: data.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    }),
});

if (!tokenResp.ok) {
    console.error(await tokenResp.text());
    throw new Error("Token exchange failed");
}

const newTokens = await tokenResp.json();

console.log("Received new tokens:", newTokens);

const updated: GoogleCalendarCredData = {
    ...data,
    oauthTokenData: {
        ...data.oauthTokenData,
        access_token: newTokens.access_token,
        expires_in: newTokens.expires_in,
        refresh_token: newTokens.refresh_token ?? data.oauthTokenData.refresh_token,
        token_type: newTokens.token_type,
        scope: newTokens.scope,
        refresh_token_expires_in: newTokens.refresh_token_expires_in ?? data.oauthTokenData.refresh_token_expires_in,
        callbackQueryString: {
            scope: newTokens.scope,
        },
    },
};
gCalendarCred.data = updated;
credManager.set<GoogleCalendarCredData>(gCalendarCred);

await credManager.saveToFile(creds_file);

console.log("Credentials updated and saved.");

// Waits until /callback receives the OAuth code
function waitForOAuthCode(router: Router): Promise<string> {
    return new Promise((resolve) => {

        router.get("/callback", (ctx) => {
            const code = ctx.request.url.searchParams.get("code");

            ctx.response.body = "Google Calendar re-auth successful! You can close this.";

            if (code) {
                resolve(code);
            } else {
                console.error("Callback hit but no ?code= present.");
            }
        });
    });
}