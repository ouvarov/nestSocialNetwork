abstract class StorageService {
  abstract save(
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<string>;

  abstract publicUrl(path: string): string;
}

export { StorageService };
