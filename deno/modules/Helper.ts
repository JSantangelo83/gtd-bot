export class Helper {
    static now(): string {
        const fmt = new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/Argentina/Buenos_Aires",
            dateStyle: "full",
            timeStyle: "long",
        });
        const now = new Date();
        return fmt.format(now)
    }
}