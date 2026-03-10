import type { StorageProvider } from "./types";
import { LocalStorage } from "./local";

// Switch to S3 by setting STORAGE_PROVIDER=s3 and implementing S3Storage
function createStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER ?? "local";

  if (provider === "s3") {
    // Future: import { S3Storage } from "./s3";
    // return new S3Storage();
    throw new Error("S3 storage not yet implemented. Set STORAGE_PROVIDER=local or remove the env var.");
  }

  return new LocalStorage();
}

export const storage = createStorage();
export type { StorageProvider } from "./types";
