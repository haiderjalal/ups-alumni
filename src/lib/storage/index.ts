import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Production adapter backed by Supabase Storage. The bucket must be private (not public). Files are only read
 * through the authorized /api/files route, so no public URLs are ever generated. The service-role key stays on
 * the server and is never sent to the browser.
 */
class SupabaseStorageAdapter implements StorageAdapter {
  private readonly client: SupabaseClient;

  constructor(
    private readonly bucket: string,
    options: { url: string; serviceRoleKey: string },
  ) {
    this.client = createClient(options.url, options.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async put(input: { key: string; body: Uint8Array; contentType: string }): Promise<void> {
    assertSafeStorageKey(input.key);
    // Copy into a standard ArrayBuffer-backed array, which is what the Blob constructor accepts.
    const bytes = new Uint8Array(input.body.byteLength);
    bytes.set(input.body);
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(input.key, new Blob([bytes], { type: input.contentType }), {
        contentType: input.contentType,
        upsert: false,
      });
    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }
  }

  async get(key: string): Promise<Uint8Array | null> {
    assertSafeStorageKey(key);
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error) {
      const notFound = error.status === 404 || error.statusCode === "404" || /not found/i.test(error.message);
      if (notFound) {
        return null;
      }
      throw new Error(`Supabase Storage download failed: ${error.message}`);
    }
    return new Uint8Array(await data.arrayBuffer());
  }

  async remove(key: string): Promise<void> {
    assertSafeStorageKey(key);
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
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
    env.STORAGE_DRIVER === "supabase"
      ? new SupabaseStorageAdapter(env.SUPABASE_STORAGE_BUCKET, {
          url: env.SUPABASE_URL ?? "",
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        })
      : new LocalStorageAdapter(path.resolve(env.STORAGE_LOCAL_DIR));

  return storage;
}
