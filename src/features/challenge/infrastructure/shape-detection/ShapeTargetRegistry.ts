import { elongatedShapeTarget, type ShapeTarget } from "../../domain/ShapeTarget";
export interface ShapeTargetRegistry { getAll(): ShapeTarget[]; getById(id: string): ShapeTarget | null; }
export class StaticShapeTargetRegistry implements ShapeTargetRegistry { private targets = [elongatedShapeTarget]; getAll() { return this.targets; } getById(id: string) { return this.targets.find((target) => target.id === id) ?? null; } }
