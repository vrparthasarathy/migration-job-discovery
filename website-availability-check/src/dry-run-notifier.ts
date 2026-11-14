import type { Alert, Notifier } from "./ports.ts";

export class DryRunNotifier implements Notifier {
  #print: (line: string) => void;

  constructor(print: (line: string) => void = console.log) {
    this.#print = print;
  }

  async send(alert: Alert): Promise<void> {
    const detail = alert.status !== undefined ? `status ${alert.status}` : `reason ${alert.reason}`;
    this.#print(
      `DRY-RUN alert to [${alert.recipients.join(", ")}]: ${alert.url} is down (${detail}) at ${alert.time}`,
    );
  }
}
