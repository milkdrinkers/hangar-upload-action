export type HangarPlatform = "PAPER" | "WATERFALL" | "VELOCITY";

export interface FileInput {
  path?: string;
  url?: boolean;
  externalUrl?: string;
  platforms: HangarPlatform[];
}

export interface HangarFile {
  platforms: HangarPlatform[];
  url?: boolean;
  externalUrl?: string;
}

export interface VersionUpload {
  version: string;
  channel: string;
  description?: string;
  files: HangarFile[];
  pluginDependencies: Record<string, string>;
  platformDependencies: Record<string, string[]>;
}

export interface RestAuthenticateResponse {
  expiresIn: number;
  token: string;
}

export interface RestUploadResponse {
  url: string;
}

export interface ActionInputs {
  apiToken: string;
  slug: string;
  version: string;
  channel: string;
  files: FileInput[];
  description?: string;
  pluginDependencies: Record<string, string>;
  platformDependencies: Record<string, string[]>;
}

export class HangarError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "HangarError";
  }
}
