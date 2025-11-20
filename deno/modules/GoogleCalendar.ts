import { BaseNode, BaseNodeParams } from "./nodes/BaseNode.ts";

export interface GoogleCalendarCredData {
    clientId: string,
    clientSecret: string,
    oauthTokenData: {
        access_token: string,
        expires_in: number,
        refresh_token: string,
        scope: string,
        token_type: string,
        refresh_token_expires_in: number,
        callbackQueryString: {
            scope: string
        }
    }
}
export interface GoogleCalendarParams extends BaseNodeParams<GoogleCalendarCredData> {

}

export class GoogleCalendar extends BaseNode<GoogleCalendarCredData> {
    constructor(private params: GoogleCalendarParams) {
        super()
    }

    static create(params: GoogleCalendarParams): Promise<GoogleCalendar> {
        return BaseNode.factory(GoogleCalendar, params);
    }

    override async healthCheck(): Promise<void> {
        await this.makeRequest(() => fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=1",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.params.cred.data.oauthTokenData.access_token}`,
                },
            }
        ))
    }

    private async makeRequest(request: () => Promise<Response>) {
        const res = await request()
        // If token expired, refresh and retry
        if (res.status === 401) {
            await this.refreshAccessToken();
            return request();
        }

        if (!res.ok) {
            throw new Error(`${res.status} ${await res.text()}`);
        }

        return await res.json()
    }

    private async refreshAccessToken() {
        const params = new URLSearchParams({
            client_id: this.params.cred.data.clientId,
            client_secret: this.params.cred.data.clientSecret,
            refresh_token: this.params.cred.data.oauthTokenData.refresh_token,
            grant_type: "refresh_token",
        });
        console.log("REFRESH TOKEN:", this.params.cred.data.oauthTokenData.refresh_token);

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        if (!res.ok) {
            throw new Error(`Failed to refresh token: ${res.status} ${await res.text()}`);
        }

        const json = await res.json();
        this.params.cred.data.oauthTokenData.access_token = json.access_token;
    }

    public async scheduleEvent(event: Event): Promise<ScheduleEventResult> {
        const body = {
            summary: event.title,
            description: event.description,
            start: { dateTime: event.start },
            end: { dateTime: event.end },
            recurrence: event.rrule ? [event.rrule] : undefined,
        };

        const res = await this.makeRequest(() => fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.params.cred.data.oauthTokenData.access_token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        ));

        return { id: res.id };
    }
}

export interface Event {
    title: string;
    description?: string;
    rrule?: string;
    start: string; // e.g. "2025-11-20T10:00:00-03:00"
    end: string;
}

export interface ScheduleEventResult {
    id: string
}