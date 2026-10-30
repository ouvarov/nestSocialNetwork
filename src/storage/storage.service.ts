abstract class StorageService {
  abstract save(
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<string>;

  abstract publicUrl(path: string): string;

  abstract remove(path: string): Promise<void>;

  abstract removeDirectory(path: string): Promise<void>;
}

export { StorageService };
