import * as core from "@actions/core";
import { Logger } from "./logger.js";
import { InputParser } from "./input-parser.js";
import { FileProcessor } from "./file-processor.js";
import { HangarClient } from "./hangar-client.js";
import { VersionResolver } from "./version-resolver.js";
import { VersionUpload, HangarError } from "./types.js";

async function main(): Promise<void> {
  const logger = new Logger();

  try {
    logger.info("Starting Hangar upload action");

    const inputParser = new InputParser(logger);
    const inputs = inputParser.parseInputs();

    logger.info(
      `Uploading version ${inputs.version} to project ${inputs.slug} on channel ${inputs.channel}`,
    );

    const fileProcessor = new FileProcessor(logger);
    const { form, filesData } = await fileProcessor.processFiles(inputs.files);

    const versionResolver = new VersionResolver(logger);
    const resolvedPlatformDependencies =
      await versionResolver.resolvePlatformDependencies(
        inputs.platformDependencies,
      );

    const versionUpload: VersionUpload = {
      version: inputs.version,
      channel: inputs.channel,
      description: inputs.description,
      files: filesData,
      pluginDependencies: inputs.pluginDependencies,
      platformDependencies: resolvedPlatformDependencies,
    };

    logger.debug("Version upload payload", versionUpload);

    const hangarClient = new HangarClient(logger);

    const token = await hangarClient.authenticate(inputs.apiToken, inputs.slug);

    const uploadResult = await hangarClient.uploadVersion(
      inputs.slug,
      token,
      form,
      versionUpload,
    );

    core.setOutput("upload_url", uploadResult.url);
    logger.info(`Upload completed successfully! URL: ${uploadResult.url}`);
  } catch (error) {
    if (error instanceof HangarError) {
      logger.error(`Hangar API error (${error.statusCode}): ${error.message}`);
      if (error.responseBody) {
        logger.debug("API response body", error.responseBody);
      }
    } else if (error instanceof Error) {
      logger.error(`Action failed: ${error.message}`);
      logger.debug("Error stack", error.stack);
    } else {
      logger.error("Unknown error occurred", error);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMessage);
    process.exit(1);
  }
}

await main().catch((error) => {
  const logger = new Logger();
  logger.error("Unhandled error in main function", error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  core.setFailed(errorMessage);
  process.exit(1);
});
