export class NotImplementedError extends Error { constructor(feature: string) { super(`${feature} will be implemented in a future phase.`); } }
export interface CameraCaptureService { capture(): Promise<string>; }
export interface ShapeDetectionResult { matched: boolean; confidence: number; }
export interface ShapeDetectionService { analyze(imageUri: string, targetShapeId: string): Promise<ShapeDetectionResult>; }
export class DeferredCameraCaptureService implements CameraCaptureService { capture(): Promise<string> { return Promise.reject(new NotImplementedError("Camera capture")); } }
export class DeferredShapeDetectionService implements ShapeDetectionService { analyze(): Promise<ShapeDetectionResult> { return Promise.reject(new NotImplementedError("Shape detection")); } }
