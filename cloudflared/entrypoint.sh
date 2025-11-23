#!/bin/sh

# Start cloudflared in the background and capture logs
cloudflared tunnel --no-autoupdate --url http://deno-dev 2>&1 \
    | tee /tmp/cloudflared.log &

# Wait until the URL appears
echo "Waiting for tunnel URL..."
while true; do
    URL=$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' /tmp/cloudflared.log | head -n 1)
    if [ ! -z "$URL" ]; then
        echo "[+] Tunnel Url: $URL"
        break
    fi
    sleep 1
done

# Tiny HTTP server to serve the URL
# curl cloudflared:4040/url → returns the URL
(
  while true; do
    { 
      echo -e "HTTP/1.1 200 OK\r"
      echo -e "Content-Type: text/plain\r"
      echo -e "\r"
      echo -n "$URL"
    } | nc -l -p 80
  done
) &
wait
