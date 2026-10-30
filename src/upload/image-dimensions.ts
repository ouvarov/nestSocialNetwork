import { imageSize } from 'image-size';

type ImageDimensions = { width: number; height: number };
type MeasuredImage = ImageDimensions & { orientation?: number };

const MAX_IMAGE_SIDE_PX = 20_000;
const SIDEWAYS_EXIF_ORIENTATIONS = new Set([5, 6, 7, 8]);

const orientDimensions = ({
  width,
  height,
  orientation,
}: MeasuredImage): ImageDimensions =>
  orientation && SIDEWAYS_EXIF_ORIENTATIONS.has(orientation)
    ? { width: height, height: width }
    : { width, height };

const isPlausible = ({ width, height }: ImageDimensions): boolean =>
  width > 0 &&
  height > 0 &&
  width <= MAX_IMAGE_SIDE_PX &&
  height <= MAX_IMAGE_SIDE_PX;

const readImageDimensions = (data: Buffer): ImageDimensions | null => {
  try {
    const { width, height, orientation } = imageSize(data);
    const dimensions = orientDimensions({ width, height, orientation });

    return isPlausible(dimensions) ? dimensions : null;
  } catch {
    return null;
  }
};

export { orientDimensions, readImageDimensions };
export type { ImageDimensions };
