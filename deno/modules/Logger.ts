const colors = {
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

type Level = "debug" | "info" | "warn" | "error";

export class Logger {
  private static format(level: Level, message: string, prefix?: string) {
    const ts = colors.gray(new Date().toISOString());

    const color =
      level === "debug" ? colors.blue :
      level === "info"  ? colors.green :
      level === "warn"  ? colors.yellow :
                          colors.red;

    const tag = color(level.toUpperCase());
    const group = prefix ? ` ${prefix}` : "";

    return `${ts} ${tag}${group} ${message}`;
  }

  static debug(msg: string, prefix?: string) {
    console.log(this.format("debug", msg, prefix));
  }

  static info(msg: string, prefix?: string) {
    console.log(this.format("info", msg, prefix));
  }

  static warn(msg: string, prefix?: string) {
    console.warn(this.format("warn", msg, prefix));
  }

  static error(msg: string, prefix?: string) {
    console.error(this.format("error", msg, prefix));
  }
}
