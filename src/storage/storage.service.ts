abstract class StorageService {
  abstract save(
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<string>;

  abstract publicUrl(path: string): string;

  abstract removeDirectory(path: string): Promise<void>;
}

export { StorageService };
