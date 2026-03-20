export const PLAN_TOKENS: Record<string, number> = {
  FREE: 3,
  PRO: 6,
  MAX: 12,
};

export const PRICE_TO_PLAN: Record<string, 'PRO' | 'MAX'> = {
  [process.env.STRIPE_PRO_PRICE_ID!]: 'PRO',
  [process.env.STRIPE_MAX_PRICE_ID!]: 'MAX',
};
