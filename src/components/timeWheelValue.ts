export const wrapWheelValue = (value: number, count: number) =>
  ((value % count) + count) % count;

export const formatWheelValue = (value: number) => String(value).padStart(2, "0");
