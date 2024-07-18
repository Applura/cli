import readline from "node:readline";
import { read } from "read";

export const style = {
  bold: "\x1b[1m",
  italic: "\x1b[3m",
  reset: "\x1b[0m",
};

export function isYes(answer) {
  const check = answer.toLowerCase();
  return ["y", "yes"].some((v) => check === v);
}

export async function confirm({ question, confirmOnEnter, input, output }) {
  const answer = await read({
    silent: false,
    prompt: `${question} [Y/n] ${confirmOnEnter ? "(yes)" : "(no)"}`,
    input: input,
    output: output,
  });
  return isYes(answer) || (confirmOnEnter && answer.length === 0);
}

export async function printWhile(
  stdStream,
  { pending, resolved, rejected },
  unresolved,
) {
  let done = false;
  let succeeded = false;
  const results = await Promise.all([
    (async () => {
      const result = await unresolved;
      succeeded = true;
      done = true;
      return result;
    })(),
    (async () => {
      let i = 0;
      const frames = "\\|/-";
      while (!done) {
        const char = frames[i++ % frames.length];
        stdStream.write(`${char} ${pending}`);
        await delay(120);
        readline.clearLine(stdStream, -1);
        readline.cursorTo(stdStream, 0);
      }
    })(),
  ]);
  readline.clearLine(stdStream, -1);
  readline.cursorTo(stdStream, 0);
  stdStream.write(succeeded ? resolved : rejected);
  return results[0];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
