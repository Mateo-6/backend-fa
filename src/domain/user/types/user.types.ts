// Shared types for User - single source of truth for the structure
export interface UserBase {
  username: string;
  name: string;
  password: string;
  phone: string;
  email: string;
}

export interface UserWithId extends UserBase {
  id: string;
}

export interface UserWithTimestamps extends UserWithId {
  createdAt: Date;
  updatedAt: Date;
}

