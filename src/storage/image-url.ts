import type { StorageService } from './storage.service';

type StoredImage = {
  imageKey: string | null;
  legacyImageUrl: string | null;
};

const toImageUrl = (
  storage: StorageService,
  { imageKey, legacyImageUrl }: StoredImage,
): string | null => (imageKey ? storage.publicUrl(imageKey) : legacyImageUrl);

export { toImageUrl };
export type { StoredImage };
