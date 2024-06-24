import { configFileName, Config } from "../lib/config.js";
import { mkdirSync } from "node:fs";
import { read } from "read";
import { writeFile } from "node:fs/promises";
import { sep } from "node:path";

function isYes(answer) {
  const check = answer.toLowerCase();
  return ["y", "yes"].some((v) => check === v);
}

export async function setUpMissingConfigurationDirectory(
  programArgs,
  { stdin, stdout, stderr },
  context,
) {
  const configDir = context.configurationDirectory;
  const answer = await read({
    silent: false,
    prompt: `${configDir} does not exist. Would you like to create it? [Y/n] `,
    input: stdin,
    output: stdout,
  });
  if (!isYes(answer)) {
    return false;
  }
  const created = mkdirSync(configDir, {
    recursive: true,
    mode: 0o700,
  });
  if (created === undefined) {
    stderr.write(`unable to create directory: ${configDir}\n`);
    return false;
  }
  return await setUpMissingConfigurationFile(
    programArgs,
    { stdin, stdout, stderr },
    context,
    { yes: true },
  );
}

export async function setUpMissingConfigurationFile(
  programArgs,
  { stdin, stdout, stderr },
  context,
  { yes } = { yes: false },
) {
  const configDir = context.configurationDirectory;
  if (!yes) {
    const answer = await read({
      silent: false,
      prompt: `${configDir}/${configFileName} does not exist. Would you like to create it? [Y/n] `,
      input: stdin,
      output: stdout,
    });
    yes = isYes(answer);
  }
  if (!yes) {
    return false;
  }
  const config = Config.generate(context).normalized;
  const configFilePath = `${configDir}${sep}${configFileName}`;
  await writeFile(configFilePath, JSON.stringify(config), {
    mode: 0o640,
  });
  stderr.write(`${configFilePath} created.\n`);
  return true;
}
