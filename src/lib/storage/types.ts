export interface StorageProvider {
  /** Upload a file to storage */
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>;

  /** Download a file from storage */
  download(key: string): Promise<{ buffer: Buffer; contentType: string }>;

  /** Delete a file from storage */
  delete(key: string): Promise<void>;
}
