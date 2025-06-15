import * as core from "@actions/core";

export class Logger {
  private readonly debugEnabled: boolean;

  constructor() {
    this.debugEnabled = core.isDebug();
  }

  info(message: string, data?: unknown): void {
    if (data !== undefined) {
      core.info(`${message} ${this.stringify(data)}`);
    } else {
      core.info(message);
    }
  }

  debug(message: string, data?: unknown): void {
    if (this.debugEnabled) {
      if (data !== undefined) {
        core.debug(`${message} ${this.stringify(data)}`);
      } else {
        core.debug(message);
      }
    }
  }

  error(message: string, error?: unknown): void {
    if (error instanceof Error) {
      core.error(`${message}: ${error.message}`);
      if (this.debugEnabled && error.stack) {
        core.debug(`Stack trace: ${error.stack}`);
      }
    } else if (error !== undefined) {
      core.error(`${message}: ${this.stringify(error)}`);
    } else {
      core.error(message);
    }
  }

  warning(message: string, data?: unknown): void {
    if (data !== undefined) {
      core.warning(`${message} ${this.stringify(data)}`);
    } else {
      core.warning(message);
    }
  }

  private stringify(data: unknown): string {
    try {
      return typeof data === "string" ? data : JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
