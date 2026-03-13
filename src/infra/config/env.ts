export const env = {
    PORT: process.env.PORT || 3000,
    DATABASE_URL: process.env.DATABASE_URL || "mysql://user:user123@localhost:3306/mydb",
    MONGO_URL: process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://root:rootpassword@localhost:27017/mydb?authSource=admin",
    JWT_SECRET: process.env.JWT_SECRET || "your-secret-key-change-in-production",
};