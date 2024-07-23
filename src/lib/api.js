import { DeployKey } from "./deploy-key.js";
import { zip } from "bestzip";
import { mkdtempSync, statSync, createReadStream } from "node:fs";
import { UnknownError } from "./errors.js";
import parse from "./resource.js";
import { tmpdir } from "node:os";
import { sep } from "node:path";
import { printWhile } from "./cli.js";

export async function apiDeploy(
  key,
  deployFolder,
  releaseNote,
  { stdin, stdout, stderr },
  config,
) {
  if (typeof key === "object") {
    key = key.read()
  }
  const project = await DeployKey.getProject(key, { config });
  const releaseOverviewLink = project.links.get("releases").href;
  let releaseOverview = await getLinkData(key, releaseOverviewLink, { config });
  const createFormLink = releaseOverview.links.get("create-form").href;
  const createFrom = await getLinkData(key, createFormLink, { config });
  const testDir = mkdtempSync(`${tmpdir()}${sep}`);
  const filepath = `${testDir}${sep}deploy.zip`;
  await printWhile(
      stderr,
      {
        pending: "Creating deployment artifact…",
        resolved: `Deployment artifact created. (${filepath})\n`,
        rejected: "Deployment artifact creation failed.\n",
      },
      zip({source: deployFolder, destination: `${testDir}${sep}deploy.zip`}),
  );
  const uploadLink = createFrom.links.get(
    "https://docs.applura.com/operations/link-relations/upload-frontend-release",
  ).href;
  const stats = statSync(`${testDir}${sep}deploy.zip`);
  const fileSizeInBytes = stats.size;
  let readStream = createReadStream(`${testDir}${sep}deploy.zip`);
  await printWhile(
    stderr,
    {
      pending: "Uploading deploy file…",
      resolved: "File upload complete.\n",
      rejected: "Deploy file upload failed.\n",
    },
    await fetch(uploadLink, {
      headers: {
        "Content-length": fileSizeInBytes,
      },
      method: "PUT",
      body: readStream,
      duplex: "half",
    }),
  );
  releaseOverview = await getLinkData(key, releaseOverviewLink, { config });
  const releaseEditFormLink =
    releaseOverview.releases[0].links.get("edit-form").href;
  const releaseId = releaseOverview.releases[0].id;
  const payload = {
    data: {
      type: "frontend-release",
      id: releaseId,
      attributes: {
        deployed: true,
        notes: releaseNote,
      },
    },
  };
  const releaseEditForm = await fetch(config.serverURL + releaseEditFormLink, {
    headers: {
      authorization: `Bearer ${key}`,
    },
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (releaseEditForm.status !== 200) {
    throw new UnknownError(`unexpected status code: ${releaseEditForm.status}`);
  }
}

/**
 *
 * @param key
 * @param {object} options
 * @param {Config} options.config
 * @param href
 */
async function getLinkData(key, href, { config }) {
  const response = await fetch(config.serverURL + href, {
    headers: {
      authorization: `Bearer ${key}`,
    },
  });
  if (response.status !== 200) {
    throw new UnknownError(`unexpected status code: ${response.status}`);
  }
  const mediaType =
    response.headers.get("content-type") || "no content-type header";
  if (!mediaType.startsWith("application/vnd.api+json")) {
    throw new UnknownError(`unexpected media type: ${mediaType}`);
  }
  return parse(await response.json());
}
