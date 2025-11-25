// Shared types for User - single source of truth for the structure
export interface User {
  id?: string;
  username: string;
  name: string;
  password: string;
  phone: string;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

