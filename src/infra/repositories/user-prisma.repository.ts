import { UserWithId } from '../../domain/user/types/user.types';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { prisma } from '../database/prisma-client';

export class UserPrismaRepository implements UserRepository {
  async create(user: UserWithId): Promise<UserWithId> {
    // Note: Prisma schema only has name, email, age - missing username, password, phone
    // This is a limitation of the current Prisma schema
    const createdUser = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: 0, // Default value since age is not in UserWithId
      },
    });

    return this.toDomain(createdUser);
  }

  async findAll(): Promise<UserWithId[]> {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(user => this.toDomain(user));
  }

  async findById(id: string): Promise<UserWithId | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  // Mapping from Prisma entity to UserWithId
  // Note: Prisma model is missing username, password, phone fields
  private toDomain(prismaUser: {
    id: string;
    name: string;
    email: string;
    age: number;
    createdAt: Date;
    updatedAt: Date;
  }): UserWithId {
    return {
      id: prismaUser.id,
      username: '', // Not available in Prisma schema
      name: prismaUser.name,
      email: prismaUser.email,
      password: '', // Not available in Prisma schema
      phone: '', // Not available in Prisma schema
    };
  }
}

