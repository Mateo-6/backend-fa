if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET env var is required');
}
if (!process.env.MONGO_URI && !process.env.MONGO_URL) {
  throw new Error('MONGO_URI env var is required');
}

export const env = {
  PORT: process.env.PORT || 3000,
  MONGO_URL: (process.env.MONGO_URI || process.env.MONGO_URL)!,
  JWT_SECRET: process.env.JWT_SECRET!,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:8081',
};
