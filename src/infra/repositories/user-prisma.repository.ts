import { User } from '../../domain/user/entities/user';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { prisma } from '../database/prisma-client';

export class UserPrismaRepository implements UserRepository {
  async create(user: User): Promise<User> {
    const createdUser = await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
      },
    });

    return this.toDomain(createdUser);
  }

  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(user => this.toDomain(user));
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  // Mapeo de la entidad de Prisma a la entidad de dominio
  private toDomain(prismaUser: {
    id: string;
    name: string;
    email: string;
    age: number;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(prismaUser.id, prismaUser.name, prismaUser.email, prismaUser.age);
  }
}

