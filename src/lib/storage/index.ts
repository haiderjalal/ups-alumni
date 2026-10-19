import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { getEnv } from "@/lib/env";

import { assertSafeStorageKey, type StorageAdapter } from "./types";

export type { StorageAdapter } from "./types";

/** Development adapter. Files live under STORAGE_LOCAL_DIR, outside the public folder. */
class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  private resolvePath(key: string): string {
    assertSafeStorageKey(key);
    return path.join(this.root, key);
  }

  async put(input: { key: string; body: Uint8Array }): Promise<void> {
    const target = this.resolvePath(input.key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.body);
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolvePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolvePath(key), { force: true });
  }
}

/** Production adapter for any S3-compatible service (AWS S3, MinIO, Cloudflare R2). Bucket stays private. */
class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    options: { region: string; endpoint?: string; forcePathStyle: boolean; accessKeyId: string; secretAccessKey: string },
  ) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
      credentials: { accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey },
    });
  }

  async put(input: { key: string; body: Uint8Array; contentType: string }): Promise<void> {
    assertSafeStorageKey(input.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async get(key: string): Promise<Uint8Array | null> {
    assertSafeStorageKey(key);
    try {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return response.Body ? await response.Body.transformToByteArray() : null;
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") {
        return null;
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    assertSafeStorageKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let storage: StorageAdapter | undefined;

/** Returns the configured private storage adapter. */
export function getStorage(): StorageAdapter {
  if (storage) {
    return storage;
  }

  const env = getEnv();
  storage =
    env.STORAGE_DRIVER === "s3"
      ? new S3StorageAdapter(env.S3_BUCKET ?? "", {
          region: env.S3_REGION,
          endpoint: env.S3_ENDPOINT,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
          accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
          secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
        })
      : new LocalStorageAdapter(path.resolve(env.STORAGE_LOCAL_DIR));

  return storage;
}
