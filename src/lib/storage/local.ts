import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./types";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export class LocalStorage implements StorageProvider {
  async upload(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
  }

  async download(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const filePath = path.join(UPLOADS_DIR, key);
    const buffer = await fs.readFile(filePath);
    // Content type is stored in DB, not on disk — caller provides it
    return { buffer, contentType: "application/octet-stream" };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, key);
    await fs.unlink(filePath).catch(() => {
      // Ignore if file doesn't exist
    });
  }
}
