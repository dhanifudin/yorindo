/**
 * Auth Service
 *
 * Handles login (bcrypt verify), JWT issuance, refresh token rotation,
 * and Redis-based token blacklist for logout (jti revocation).
 *
 * Redis is optional — when null (test/Phase 1 env without REDIS_URL),
 * blacklist checks are skipped and logout is a no-op.
 */

import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createId } from '@paralleldrive/cuid2'
import type { Redis } from 'ioredis'
import type { IUserRepository } from '../interfaces/repositories/IUserRepository.js'
import { config } from '../config/index.js'

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  role: string
  name: string | null
}

const ACCESS_TOKEN_TTL = 15 * 60        // 15 minutes (seconds)
const REFRESH_TOKEN_TTL = 7 * 24 * 3600 // 7 days (seconds)

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private redis: Redis | null,
  ) {}

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: AuthUser }> {
    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' })
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatch) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401, code: 'INVALID_CREDENTIALS' })
    }

    const { accessToken, refreshToken } = this._issueTokens(user.id, user.role)

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, role: user.role, name: user.name },
    }
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    let payload: { sub: string; role?: string; jti: string; exp: number }

    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as typeof payload
    } catch {
      throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401, code: 'INVALID_TOKEN' })
    }

    // Check if refresh token jti is blacklisted
    if (await this.isBlacklisted(payload.jti)) {
      throw Object.assign(new Error('Token has been revoked'), { statusCode: 401, code: 'TOKEN_REVOKED' })
    }

    const user = await this.userRepo.findById(payload.sub)
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 401, code: 'INVALID_TOKEN' })
    }

    const { accessToken } = this._issueTokens(user.id, user.role)
    return { accessToken }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(jti: string, exp: number): Promise<void> {
    if (!this.redis) return // no-op when Redis unavailable (Phase 1 tests)
    const now = Math.floor(Date.now() / 1000)
    const ttl = Math.max(exp - now, 1)
    await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl)
  }

  // ─── Blacklist check ──────────────────────────────────────────────────────

  async isBlacklisted(jti: string): Promise<boolean> {
    if (!this.redis) return false
    const result = await this.redis.exists(`blacklist:${jti}`)
    return result === 1
  }

  // ─── Token issuance ───────────────────────────────────────────────────────

  private _issueTokens(userId: string, role: string): TokenPair {
    const now = Math.floor(Date.now() / 1000)

    const accessToken = jwt.sign(
      {
        sub: userId,
        role,
        jti: createId(),
        iat: now,
        exp: now + ACCESS_TOKEN_TTL,
      },
      config.jwtSecret,
    )

    const refreshToken = jwt.sign(
      {
        sub: userId,
        role,
        jti: createId(),
        iat: now,
        exp: now + REFRESH_TOKEN_TTL,
      },
      config.jwtRefreshSecret,
    )

    return { accessToken, refreshToken }
  }
}
