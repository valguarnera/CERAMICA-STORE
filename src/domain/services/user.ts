import type { Kysely, Transaction } from 'kysely';
import type { Database } from '@/domain/db';
import { randomUUID } from 'crypto';
import { sql } from 'kysely';

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
    return this.db.transaction().execute(async (trx: Transaction<Database>) => {
      const id = randomUUID();
      const now = new Date().toISOString();

      const result = await sql`
        INSERT INTO users (id, email, password_hash, role, name, created_at, updated_at)
        SELECT ${id}, ${input.email}, ${input.passwordHash},
          CASE WHEN (SELECT COUNT(*) FROM users) = 0 THEN 'ADMIN' ELSE 'CUSTOMER' END,
          ${input.name}, ${now}, ${now}
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ${input.email})
      `.execute(trx);

      if (Number((result as unknown as { numInsertedOrUpdatedRows: bigint }).numInsertedOrUpdatedRows) === 0) {
        throw new Error('EMAIL_EXISTS');
      }

      const insertedUser = await trx
        .selectFrom('users')
        .select(['id', 'email', 'name', 'role', 'created_at', 'updated_at'])
        .where('id', '=', id)
        .executeTakeFirst();

      return {
        id: insertedUser!.id,
        email: insertedUser!.email,
        name: insertedUser!.name,
        role: insertedUser!.role,
        createdAt: insertedUser!.created_at,
        updatedAt: insertedUser!.updated_at,
      };
    });
  }

  async getUserCount(): Promise<number> {
    const count = await this.db
      .selectFrom('users')
      .select(({ fn }) => fn.count('id').as('count'))
      .executeTakeFirst();

    return Number(count?.count ?? 0);
  }
}