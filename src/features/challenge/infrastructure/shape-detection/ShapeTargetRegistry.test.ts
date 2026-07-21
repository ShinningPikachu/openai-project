import { describe, expect, it } from "vitest";
import { StaticShapeTargetRegistry } from "./ShapeTargetRegistry";

describe("simple shape targets", () => {
  const registry = new StaticShapeTargetRegistry();

  it("lists the supported local shapes", () => {
    expect(registry.getAll().map((target) => target.id)).toEqual([
      "circle",
      "triangle",
      "square",
      "rectangle",
    ]);
  });

  it("does not expose the removed spoon-like target", () => {
    expect(registry.getById("spoon")).toBeNull();
    expect(registry.getById("elongated")).toBeNull();
  });
});
