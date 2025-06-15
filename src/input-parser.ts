import * as core from "@actions/core";
import { ActionInputs, FileInput } from "./types.js";
import { Logger } from "./logger.js";

export class InputParser {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  parseInputs(): ActionInputs {
    try {
      this.logger.debug("Parsing action inputs");

      const apiToken = this.getRequiredInput("api_token");
      const slug = this.getRequiredInput("slug");
      const version = this.getRequiredInput("version");
      const channel = this.getRequiredInput("channel");
      const filesInput = this.getRequiredInput("files");

      const description = this.getOptionalInput("description");
      const pluginDependenciesInput = this.getOptionalInput(
        "plugin_dependencies",
      );
      const platformDependenciesInput = this.getOptionalInput(
        "platform_dependencies",
      );

      const files = this.parseFiles(filesInput);
      const pluginDependencies = this.parseJsonInput(
        pluginDependenciesInput,
        "plugin_dependencies",
        {},
      );
      const platformDependencies = this.parseJsonInput(
        platformDependenciesInput,
        "platform_dependencies",
        {},
      );

      this.logger.debug("Successfully parsed all inputs");

      return {
        apiToken,
        slug,
        version,
        channel,
        files,
        description,
        pluginDependencies,
        platformDependencies,
      };
    } catch (error) {
      this.logger.error("Failed to parse inputs", error);
      throw error;
    }
  }

  private getRequiredInput(name: string): string {
    const value = core.getInput(name, { required: true, trimWhitespace: true });
    if (!value) {
      throw new Error(`Required input '${name}' is missing or empty`);
    }
    return value;
  }

  private getOptionalInput(name: string): string | undefined {
    const value = core.getInput(name, {
      required: false,
      trimWhitespace: true,
    });
    return value || undefined;
  }

  private parseFiles(filesInput: string): FileInput[] {
    try {
      const parsed = JSON.parse(filesInput) as unknown;

      if (!Array.isArray(parsed)) {
        throw new Error("Files input must be an array");
      }

      return parsed.map((file, index) => {
        if (typeof file !== "object" || file === null) {
          throw new Error(`File at index ${index} must be an object`);
        }

        const fileObj = file as Record<string, unknown>;

        if (!Array.isArray(fileObj.platforms)) {
          throw new Error(`File at index ${index} must have platforms array`);
        }

        const platforms = fileObj.platforms as string[];
        const validPlatforms = ["PAPER", "WATERFALL", "VELOCITY"];

        for (const platform of platforms) {
          if (!validPlatforms.includes(platform)) {
            throw new Error(
              `Invalid platform '${platform}' at file index ${index}`,
            );
          }
        }

        const result: FileInput = {
          platforms: platforms as FileInput["platforms"],
        };

        if (typeof fileObj.path === "string") {
          result.path = fileObj.path;
        }

        if (typeof fileObj.url === "boolean") {
          result.url = fileObj.url;
        }

        if (typeof fileObj.externalUrl === "string") {
          result.externalUrl = fileObj.externalUrl;
        }

        if (!result.path && (!result.url || !result.externalUrl)) {
          throw new Error(
            `File at index ${index} must have either 'path' or both 'url' and 'externalUrl'`,
          );
        }

        return result;
      });
    } catch (error) {
      throw new Error(
        `Failed to parse files input: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private parseJsonInput<T>(
    input: string | undefined,
    name: string,
    defaultValue: T,
  ): T {
    if (!input) {
      return defaultValue;
    }

    try {
      return JSON.parse(input) as T;
    } catch (error) {
      throw new Error(
        `Failed to parse ${name} as JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
