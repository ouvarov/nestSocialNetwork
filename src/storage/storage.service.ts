abstract class StorageService {
  abstract save(
    path: string,
    data: Buffer,
    contentType: string,
  ): Promise<string>;
}

export { StorageService };
