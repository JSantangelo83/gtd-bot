// GoogleCalendar.ts
import { DecryptedCredential } from "./Credential.ts";

export interface GoogleCalendarCredData {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
}

export interface Event {
    title: string;
    description?: string;
    rrule?: string;
    start: string; // e.g. "2025-11-20T10:00:00-03:00"
    end: string;
}

export class GoogleCalendar {
    private cred: GoogleCalendarCredData;

    constructor(cred: DecryptedCredential) {
        const data = JSON.parse(cred.data);

        // Minimal extraction (simple, scalable)
        this.cred = {
            clientId: data.clientId,
            clientSecret: data.clientSecret,
            accessToken: data.oauthTokenData.access_token,
            refreshToken: data.oauthTokenData.refresh_token,
        };
    }

    private async refreshAccessToken() {
        const params = new URLSearchParams({
            client_id: this.cred.clientId,
            client_secret: this.cred.clientSecret,
            refresh_token: this.cred.refreshToken,
            grant_type: "refresh_token",
        });

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        if (!res.ok) {
            throw new Error(`Failed to refresh token: ${res.status} ${await res.text()}`);
        }

        const json = await res.json();
        this.cred.accessToken = json.access_token;
    }

    public async scheduleEvent(event: Event): Promise<{ id: string }> {
        // Google returns 401 for expired tokens → we refresh transparently
        const makeRequest = async () => {
            const body = {
                summary: event.title,
                description: event.description,
                start: { dateTime: event.start },
                end: { dateTime: event.end },
                recurrence: event.rrule ? [event.rrule] : undefined,
            };

            const res = await fetch(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${this.cred.accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                }
            );

            return res;
        };

        let res = await makeRequest();

        // If token expired → refresh and retry
        if (res.status === 401) {
            await this.refreshAccessToken();
            res = await makeRequest();
        }

        if (!res.ok) {
            throw new Error(`Failed to create event: ${res.status} ${await res.text()}`);
        }

        const json = await res.json();
        return { id: json.id };
    }
}
