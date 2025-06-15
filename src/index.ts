import core from "@actions/core";
import FormData from "form-data";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { glob } from "fast-glob";

interface FileInput {
  path: string;
  url: string;
  externalUrl: string;
  platforms: HangarPlatform[];
}

await main().catch((err) => {
  core.error(`Failed with error: ${err}`);
  core.setFailed(err.message);
});

type HangarPlatform = "PAPER" | "WATERFALL" | "VELOCITY";
interface HangarFile {
  platforms: HangarPlatform[];
  url?: boolean;
  externalUrl?: string;
}

async function main() {
  const apiToken = core.getInput("api_token", { required: true });
  const slug = core.getInput("slug", { required: true });
  const version = core.getInput("version", { required: true });
  const channel = core.getInput("channel", { required: true });
  const files = core.getInput("files", { required: true });
  const description = core.getInput("description");
  const pluginDependencies = core.getInput("plugin_dependencies");
  const platformDependencies = core.getInput("platform_dependencies");

  const form = new FormData();

  const fileEntries: FileInput[] = JSON.parse(files);

  const filesData: HangarFile[] = [];

  for (const file of fileEntries) {
    if (file.path) {
      const foundFiles = await glob(file.path);
      for (const filePath in foundFiles) {
        form.append("files", fs.createReadStream(filePath), {
          contentType: "application/x-binary",
          filename: path.basename(filePath),
        });
        filesData.push({ platforms: file.platforms });
      }
    } else if (file.url && file.externalUrl) {
      filesData.push({
        platforms: file.platforms,
        url: true,
        externalUrl: file.externalUrl,
      });
    } else {
      core.setFailed(`Invalid file data: ${JSON.stringify(file)}`);
      process.exit(1);
    }
  }

  const versionUpload = {
    version,
    channel,
    description,
    files: filesData,
    pluginDependencies: JSON.parse(pluginDependencies),
    platformDependencies: JSON.parse(platformDependencies),
  };

  core.info(JSON.stringify(versionUpload));

  form.append("versionUpload", JSON.stringify(versionUpload), {
    contentType: "application/json",
  });

  interface RestAuthenticateResponce {
    expiresIn: number;
    token: string;
  }

  const token = await fetch(
    `https://hangar.papermc.io/api/v1/authenticate?apiKey=${apiToken}`,
    {
      method: "POST",
      headers: {
        "User-Agent": `hangar-upload-action; ${slug};`,
      },
    },
  )
    .then(async (res) => {
      if (!res.ok) {
        core.setFailed(
          `Failed to authenticate: ${res.statusText} ${await res.text()}`,
        );
        process.exit(1);
      }
      return (await res.json()) as RestAuthenticateResponce;
    })
    .then((data) => data.token);

  core.info("Successfully authenticated!");

  interface RestUploadResponce {
    url: string;
  }

  const resp = await fetch(
    `https://hangar.papermc.io/api/v1/projects/${slug}/upload`,
    {
      method: "POST",
      headers: {
        "User-Agent": `hangar-upload-action; ${slug};`,
        Authorization: token,
        ...form.getHeaders(),
      },
      body: form,
    },
  ).then(async (res) => {
    if (!res.ok) {
      core.setFailed(`Failed to upload: ${res.statusText} ${await res.text()}`);
      process.exit(1);
    }
    return (await res.json()) as RestUploadResponce;
  });

  core.info(JSON.stringify(resp));
}
