import FormData from "form-data";
import fs from "fs/promises";
import path from "path";
import { glob } from "fast-glob";
import { FileInput, HangarFile } from "./types.js";
import { Logger } from "./logger.js";

export class FileProcessor {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async processFiles(
    fileInputs: FileInput[],
  ): Promise<{ form: FormData; filesData: HangarFile[] }> {
    const form = new FormData();
    const filesData: HangarFile[] = [];

    this.logger.info(`Processing ${fileInputs.length} file input(s)`);

    for (let i = 0; i < fileInputs.length; i++) {
      const file = fileInputs[i];
      this.logger.debug(`Processing file input ${i}`, file);

      try {
        if (file.path) {
          await this.processFileFromPath(file, form, filesData);
        } else if (file.url && file.externalUrl) {
          this.processExternalFile(file, filesData);
        } else {
          throw new Error(
            `Invalid file configuration at index ${i}: ${JSON.stringify(file)}`,
          );
        }
      } catch (error) {
        this.logger.error(`Failed to process file at index ${i}`, error);
        throw new Error(
          `File processing failed at index ${i}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.info(`Successfully processed ${filesData.length} file(s)`);
    return { form, filesData };
  }

  private async processFileFromPath(
    file: FileInput,
    form: FormData,
    filesData: HangarFile[],
  ): Promise<void> {
    if (!file.path) {
      throw new Error("File path is required");
    }

    this.logger.debug(`Finding files matching pattern: ${file.path}`);
    const foundFiles = await glob(file.path, { absolute: true });

    if (foundFiles.length === 0) {
      throw new Error(`No files found matching pattern: ${file.path}`);
    }

    this.logger.info(
      `Found ${foundFiles.length} file(s) matching pattern: ${file.path}`,
    );

    for (const filePath of foundFiles) {
      await this.addFileToForm(filePath, file.platforms, form, filesData);
    }
  }

  private async addFileToForm(
    filePath: string,
    platforms: FileInput["platforms"],
    form: FormData,
    filesData: HangarFile[],
  ): Promise<void> {
    try {
      await fs.access(filePath);

      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }

      this.logger.debug(
        `Adding file to form: ${filePath} (${stats.size} bytes)`,
      );

      const fileStream = (await import("fs")).createReadStream(filePath);
      const fileName = path.basename(filePath);

      form.append("files", fileStream, {
        contentType: "application/x-binary",
        filename: fileName,
      });

      filesData.push({ platforms });

      this.logger.debug(`Successfully added file: ${fileName}`);
    } catch (error) {
      throw new Error(
        `Failed to process file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private processExternalFile(file: FileInput, filesData: HangarFile[]): void {
    if (!file.externalUrl) {
      throw new Error("External URL is required for external files");
    }

    this.logger.debug(`Adding external file: ${file.externalUrl}`);

    filesData.push({
      platforms: file.platforms,
      url: true,
      externalUrl: file.externalUrl,
    });

    this.logger.debug(`Successfully added external file: ${file.externalUrl}`);
  }
}
