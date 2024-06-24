import { PassThrough } from "stream";

export function stdStreams() {
  let input = "",
    output = "",
    errors = "";
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  stdin.on("data", (chunk) => (input += chunk));
  stdout.on("data", (chunk) => (output += chunk));
  stderr.on("data", (chunk) => (errors += chunk));
  return {
    stdin,
    stdout,
    stderr,
    input(wait = 0) {
      return new Promise((res) => {
        setTimeout(() => {
          const last = input;
          input = "";
          res(last);
        }, wait);
      });
    },
    output(wait = 0) {
      return new Promise((res) => {
        setTimeout(() => {
          const last = output;
          output = "";
          res(last);
        }, wait);
      });
    },
    errors(wait = 0) {
      return new Promise((res) => {
        setTimeout(() => {
          const last = errors;
          errors = "";
          res(last);
        }, wait);
      });
    },
  };
}
