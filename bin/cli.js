#!/usr/bin/env node
import { cwd, argv, stdin, stdout, stderr, env, exit } from "node:process";
import main from "../src/main.js";
import { UserError } from "../src/lib/errors.js";

const ErrorUser = 1;

const ErrorInternal = 2;

try {
  await main(cwd(), [...argv], { stdin, stdout, stderr }, { ...env });
  exit(0);
} catch (e) {
  if (e instanceof UserError) {
    stderr.write(`${e.message}\n`);
    exit(ErrorUser);
  }
  stderr.write(`program error: ${e.message}\n`);
  exit(ErrorInternal);
}

if (argv < 3) {
  stderr.write("no command specified\n");
}
