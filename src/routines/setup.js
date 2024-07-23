import { Config, configFileName } from "../lib/config.js";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { sep } from "node:path";
import { confirm } from "../lib/cli.js";

export async function setUpMissingConfigurationDirectory(
  programArgs,
  { stdin, stdout, stderr },
  context,
) {
  const configDir = context.configurationDirectory;
  const isYes = await confirm({
    question: `${configDir} does not exist. Would you like to create it?`,
    confirmOnEnter: true,
    input: stdin,
    output: stderr,
  });
  if (!isYes) {
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
    yes = await confirm({
      question: `${configDir}/${configFileName} does not exist. Would you like to create it?`,
      confirmOnEnter: true,
      input: stdin,
      output: stderr,
    });
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
