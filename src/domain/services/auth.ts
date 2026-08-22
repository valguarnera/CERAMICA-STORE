import type { Kysely } from 'kysely';
import type { Database } from '@/domain/db';
import bcrypt from 'bcryptjs';
import { UserService } from './user';
import { SessionService, type SessionData } from './session';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'ADMIN' | 'CUSTOMER';
  };
  sessionId: string;
  expiresAt: Date;
  redirect: string;
}

export class AuthService {
  private userService: UserService;
  private sessionService: SessionService;

  constructor(db: Kysely<Database>) {
    this.userService = new UserService(db);
    this.sessionService = new SessionService(db);
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await this.userService.findByEmail(input.email);
    if (existingUser) {
      throw new Error('EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await this.userService.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    const { sessionId, expiresAt } = await this.sessionService.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      sessionId,
      expiresAt,
      redirect: user.role === 'ADMIN' ? '/admin' : '/',
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.userService.findByEmail(input.email);

    const passwordHash = await this.userService.getPasswordHash(input.email);
    const isValidPassword = passwordHash
      ? await bcrypt.compare(input.password, passwordHash)
      : await bcrypt.compare(input.password, '$2a$12$invalid');

    if (!user || !isValidPassword) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const { sessionId, expiresAt } = await this.sessionService.createSession(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      sessionId,
      expiresAt,
      redirect: user.role === 'ADMIN' ? '/admin' : '/',
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
  }

  async validateSession(sessionId: string): Promise<SessionData | null> {
    return this.sessionService.validateSession(sessionId);
  }

  get userServiceInstance(): UserService {
    return this.userService;
  }

  get sessionServiceInstance(): SessionService {
    return this.sessionService;
  }
}