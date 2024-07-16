import { Config } from "./lib/config.js";
import {
  InvalidPathError,
  KnownError,
  MissingConfigurationDirectoryError,
  MissingConfigurationFileError,
  NoCommandError,
  UnknownError,
  UserError,
} from './lib/errors.js';
import {
  setUpMissingConfigurationDirectory,
  setUpMissingConfigurationFile,
} from "./routines/setup.js";
import deployKey from "./commands/deploy-key.js";
import deploy from "./commands/deploy.js";
import { getContext } from "./lib/context.js";

const commands = {
  // init is a noop since the main function prepares any missing config.
  init: () => {},
  "deploy-key": deployKey,
  deploy: deploy,
};

export default async function main(cwd, argv, stdStreams, env) {
  let commandName = "applura",
    commandArgs = [];
  if (argv.length < 3) {
    throw new UserError(
      `no command: (try: ${Object.keys(commands).join(", ")})`,
    );
  }
  let context = undefined,
    args = [];
  try {
    [context, args] = getContext(cwd, argv.slice(2), env);
    [commandName, ...commandArgs] = args;
    if (!(commandName in commands)) {
      const e =
        commandName === undefined
          ? new NoCommandError(
              `no command: valid commands: ${Object.keys(commands).join(", ")}`,
            )
          : new UserError(
              `unrecognized command: ${commandName} (valid commands: ${Object.keys(commands).join(", ")})`,
            );
      await handle(e, commandName, argv, stdStreams, context);
    } else {
      const config = Config.read(context);
      console.log(config);
      const run = commands[commandName];
      await run(commandArgs, stdStreams, config);
    }
  } catch (e) {
    if (await handle(e, commandName, argv, stdStreams, context)) {
      await main(cwd, argv, stdStreams, env);
    }
  }
}

async function handle(e, commandName, programArgs, stdStreams, context) {
  if (!(e instanceof KnownError)) {
    throw new UnknownError(`${commandName} command error: ${e.message}`);
  }
  if (e instanceof NoCommandError) {
    throw e;
  }
  const resolveWith = (fn) => () => fn(programArgs, stdStreams, context);
  const routines = new Map([
    [MissingConfigurationDirectoryError, resolveWith(setUpMissingConfigurationDirectory)],
    [MissingConfigurationFileError, resolveWith(setUpMissingConfigurationFile)],
    [InvalidPathError, (e) => { throw e; }],
  ]);
  for (const [errorType, resolve] of routines) {
    if (e instanceof errorType) {
      return await resolve(e);
    }
  }
  throw new KnownError(`unhandled error: ${e.constructor.name}: ${e.message}`);
}
