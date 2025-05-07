import chalk, { ChalkInstance } from "chalk";

type LogLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR";

export class Logger {
  constructor(private readonly name?: string) {}

  private format(level: LogLevel, color: ChalkInstance, ...args: any[]) {
    const prefix = this.name ? chalk.magenta(`[${this.name}]`) : "";
    const levelLabel = color(`[${level}]`);
    console.log(levelLabel, prefix, ...args);
  }

  info(...args: any[]) {
    this.format("INFO", chalk.cyan, chalk.blueBright(...args));
  }

  success(...args: any[]) {
    this.format("SUCCESS", chalk.green, chalk.greenBright(...args));
  }

  warn(...args: any[]) {
    this.format("WARN", chalk.yellow, chalk.yellowBright(...args));
  }

  error(...args: any[]) {
    this.format("ERROR", chalk.red, chalk.redBright(...args));
  }

  // Static global usage
  static info(...args: any[]) {
    new Logger().info(...args);
  }

  static success(...args: any[]) {
    new Logger().success(...args);
  }

  static warn(...args: any[]) {
    new Logger().warn(...args);
  }

  static error(...args: any[]) {
    new Logger().error(...args);
  }
}
