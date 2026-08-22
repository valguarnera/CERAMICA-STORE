import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';
import { randomUUID } from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CUSTOMER';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name: string;
}

export class UserService {
  constructor(private db: Kysely<Database>) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'name', 'role', 'created_at', 'updated_at'])
      .where('email', '=', email)
      .executeTakeFirst();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.db
      .selectFrom('users')
      .select(['id', 'email', 'name', 'role', 'created_at', 'updated_at'])
      .where('id', '=', id)
      .executeTakeFirst();

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async getPasswordHash(email: string): Promise<string | null> {
    const result = await this.db
      .selectFrom('users')
      .select('password_hash')
      .where('email', '=', email)
      .executeTakeFirst();

    return result?.password_hash ?? null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const isFirstUser = await this.isFirstUser();

    const role = isFirstUser ? 'ADMIN' : 'CUSTOMER';

    await this.db
      .insertInto('users')
      .values({
        id,
        email: input.email,
        password_hash: input.passwordHash,
        name: input.name,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    const now = new Date().toISOString();
    return {
      id,
      email: input.email,
      name: input.name,
      role,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async isFirstUser(): Promise<boolean> {
    const count = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    return Number(count?.count ?? 0) === 0;
  }

  async getUserCount(): Promise<number> {
    const count = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    return Number(count?.count ?? 0);
  }
}