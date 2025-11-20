FROM denoland/deno:2.5.4 AS builder
WORKDIR /app

COPY deno.json .
COPY deno.lock .
COPY resources ./resources
COPY .env .env
COPY . .

RUN deno cache main.ts

RUN deno compile \
    --allow-all \
    --output app \
    main.ts


FROM debian:stable-slim AS run
WORKDIR /app

# COPY BOTH the binary and the resources
COPY --from=builder /app/app /app/app
COPY --from=builder /app/.env /app/.env
COPY --from=builder /app/resources /app/resources

CMD ["/app/app"]
