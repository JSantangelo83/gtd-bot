#!/bin/sh

echo "Waiting for cloudflared tunnel..."
until curl -sf "$WEBHOOK_URL_PROVIDER" > /dev/null; do
    sleep 1
done

echo "Tunnel ready. Starting Deno..."
deno run --allow-all --watch --unstable-broadcast-channel main.ts
