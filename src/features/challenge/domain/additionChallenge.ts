export interface AdditionQuestion {
  left: number;
  right: number;
  total: number;
}

export const generateAdditionQuestion = (
  random: () => number = Math.random,
): AdditionQuestion => {
  const total = 7 + Math.floor(random() * 7);
  const left = 1 + Math.floor(random() * (total - 1));

  return { left, right: total - left, total };
};
