export interface RefreshTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findByHash(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | null>;
  deleteByHash(tokenHash: string): Promise<void>;
  deleteAllByUser(userId: string): Promise<void>;
}
