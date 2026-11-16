import { run } from "./cli.ts";

process.exitCode = await run(process.argv.slice(2), {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
  today: () => new Date().toISOString().slice(0, 10),
});
