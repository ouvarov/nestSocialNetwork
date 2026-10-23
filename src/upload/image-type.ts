type ImageType = { extension: string; contentType: string };

const startsWith = (data: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => data[offset + index] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

const IMAGE_SIGNATURES: {
  matches: (data: Buffer) => boolean;
  type: ImageType;
}[] = [
  {
    matches: (data) =>
      startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    type: { extension: 'png', contentType: 'image/png' },
  },
  {
    matches: (data) => startsWith(data, [0xff, 0xd8, 0xff]),
    type: { extension: 'jpg', contentType: 'image/jpeg' },
  },
  {
    matches: (data) =>
      startsWith(data, ascii('RIFF')) && startsWith(data, ascii('WEBP'), 8),
    type: { extension: 'webp', contentType: 'image/webp' },
  },
  {
    matches: (data) =>
      startsWith(data, ascii('GIF87a')) || startsWith(data, ascii('GIF89a')),
    type: { extension: 'gif', contentType: 'image/gif' },
  },
];

const detectImageType = (data: Buffer): ImageType | null =>
  IMAGE_SIGNATURES.find(({ matches }) => matches(data))?.type ?? null;

export { detectImageType };
export type { ImageType };
