export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ShapeFeatures {
  contourArea: number;
  imageAreaRatio: number;
  perimeter: number;
  boundingBox: BoundingBox;
  aspectRatio: number;
  orientedAspectRatio: number;
  circularity: number;
  solidity: number;
  extent: number;
  cornerCount: number;
  borderContactRatio: number;
  shapeSimilarity: number;
  centerOffset: number;
  widthProfile?: number[];
  endWidthRatio?: number;
}
