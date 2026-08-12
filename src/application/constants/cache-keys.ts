export const cacheKeys = {
  categories: (userId: string) => `ami:cats:${userId}`,
  paymentMethods: (userId: string) => `ami:pms:${userId}`,
};
