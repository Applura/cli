import { DeployKey } from "./deploy-key.js";
import { zip } from "zip-a-folder";
import { mkdtempSync } from "node:fs";
import { UnknownError } from "./errors.js";
import parse from "./resource.js";
import { tmpdir } from "node:os";
import { sep } from "node:path";
import { printWhile } from "./cli.js";

export async function apiDeploy(key, deployFolder, releaseNote, {stdin, stdout, stderr}, config) {
    const project = await DeployKey.getProject(key, { config });
    const releaseOverviewLink = project.links.get('releases').href;
    let releaseOverview = await getLinkData(key, releaseOverviewLink, { config });
    const createFormLink = releaseOverview.links.get('create-form').href;
    const createFrom = await getLinkData(key, createFormLink, { config });
    const testDir = mkdtempSync(`${tmpdir()}${sep}`);
    await printWhile(
        stderr,
        {
            pending: "Creating deploy file…",
            resolved: "Deploy file creation complete.\n",
            rejected: "Deploy file creation failed.\n",
        },
        zip(deployFolder, `${testDir}${sep}deploy.zip`),
    );
    const uploadLink = createFrom.links.get('https://docs.applura.com/operations/link-relations/upload-frontend-release').href;
    const stats = fs.statSync(`${testDir}${sep}deploy.zip`);
    const fileSizeInBytes = stats.size;
    let readStream = fs.createReadStream(`${testDir}${sep}deploy.zip`);
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
            method: 'PUT',
            body: readStream,
            duplex: 'half'
        })
    );
    releaseOverview = await getLinkData(key, releaseOverviewLink, { config });
    const releaseEditFormLink = releaseOverview.releases[0].links.get('edit-form').href;
    const releaseId = releaseOverview.releases[0].id;
    const payload = {
        "data": {
            "type":"frontend-release",
            "id":releaseId,
            "attributes":{
                "deployed":true,
                "notes": releaseNote
            }
        }};
    const releaseEditForm = await fetch(config.serverURL+releaseEditFormLink, {
        headers: {
            authorization: `Bearer ${key.read()}`,
        },
        method: 'PATCH',
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
      authorization: `Bearer ${key.read()}`,
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
