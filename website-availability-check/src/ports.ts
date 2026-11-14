export type CheckResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; reason: string };

export type HttpCheck = (url: string, timeoutMs: number) => Promise<CheckResult>;

export type Alert = {
  url: string;
  status?: number;
  reason?: string;
  time: string;
  recipients: string[];
};

export type Notifier = { send(alert: Alert): Promise<void> };
