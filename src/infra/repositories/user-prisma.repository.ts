import { User } from '../../domain/user/types/user.types';
import { UserRepository } from '../../domain/user/repositories/user.repository';
import { prisma } from '../database/prisma-client';

export class UserPrismaRepository implements UserRepository {
  /**
   * Persists a new user using Prisma (limited to the fields defined in the Prisma schema).
   *
   * @param {User} user Domain user data to persist.
   * @returns {Promise<User>} The mapped domain user.
   */
  async create(user: User): Promise<User> {
    // Note: Prisma schema only has name, email, age - missing username, password, phone
    // This is a limitation of the current Prisma schema
    const createdUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        age: 0, // Default value since age is not in User
      },
    });

    return this.toDomain(createdUser);
  }

  /**
   * Retrieves all Prisma user records sorted by most recent creation time.
   *
   * @returns {Promise<User[]>} List of mapped domain users.
   */
  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users.map(user => this.toDomain(user));
  }

  /**
   * Finds a Prisma user record by id and maps it to the domain model.
   *
   * @param {string} id Identifier of the Prisma user.
   * @returns {Promise<User | null>} Domain user or null.
   */
  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  /**
   * Finds a Prisma user record by email and maps it to the domain model.
   *
   * @param {string} email Email address of the Prisma user.
   * @returns {Promise<User | null>} Domain user or null.
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    return this.toDomain(user);
  }

  // Mapping from Prisma entity to User
  // Note: Prisma model is missing username, password, phone fields
  /**
   * Updates a Prisma user record with the provided data.
   *
   * @param {string} id User identifier.
   * @param {Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>} data Fields to update.
   * @returns {Promise<User | null>} Updated user or null when missing.
   */
  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
    const mappedData: Record<string, unknown> = {};
    if (typeof data.name === 'string') {
      mappedData.name = data.name;
    }
    if (typeof data.email === 'string') {
      mappedData.email = data.email;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: mappedData,
    });

    return this.toDomain(updatedUser);
  }

  /**
   * Deletes a Prisma user record by identifier.
   *
   * @param {string} id User identifier.
   * @returns {Promise<void>} Resolves when the user is deleted.
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Maps a Prisma user entity to the domain `User` shape.
   *
   * @param {{ id: string; name: string; email: string; age: number; createdAt: Date; updatedAt: Date }} prismaUser Prisma user record.
   * @returns {User} Domain representation.
   */
  private toDomain(prismaUser: {
    id: string;
    name: string;
    email: string;
    age: number;
    createdAt: Date;
    updatedAt: Date;
  }): User {
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

