import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { createId } from '@paralleldrive/cuid2'
import type { Redis } from 'ioredis'
import type { IUserRepository } from '../interfaces/repositories/IUserRepository.js'
import { config } from '../config/index.js'

export class AuthService {
  private jwtSecret = config.jwtSecret
  private jwtRefreshSecret = config.jwtRefreshSecret

  constructor(
    private userRepo: IUserRepository,
    private redis?: Redis | null
  ) {}

  async login(email: string, pass: string) {
    const user = await this.userRepo.findByEmail(email)
    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
    }

    const valid = await bcrypt.compare(pass, user.passwordHash)
    if (!valid) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
    }

    const jti = createId()
    const accessToken = jwt.sign(
      { sub: user.id, jti, role: user.role, email: user.email },
      this.jwtSecret,
      { expiresIn: '15m' }
    )
    
    const refreshToken = jwt.sign(
      { sub: user.id, jti },
      this.jwtRefreshSecret,
      { expiresIn: '7d' }
    )

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as jwt.JwtPayload
      
      const jti = payload.jti
      if (this.redis && jti) {
        const isBlacklisted = await this.redis.exists(`blacklist:${jti}`)
        if (isBlacklisted) throw new Error('Token revoked')
      }

      if (!payload.sub) throw new Error('Missing sub in token')

      const user = await this.userRepo.findById(payload.sub)
      if (!user) throw new Error('User not found')

      const accessToken = jwt.sign(
        { sub: user.id, jti, role: user.role, email: user.email },
        this.jwtSecret,
        { expiresIn: '15m' }
      )

      return { accessToken }
    } catch (err: unknown) {
      throw { statusCode: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' }
    }
  }

  async logout(jti?: string, exp?: number) {
    if (!jti || !this.redis) return
    
    // Calculate seconds remaining until token expires
    const now = Math.floor(Date.now() / 1000)
    const ttl = exp ? exp - now : 86400
    
    if (ttl > 0) {
      // Store in Redis with TTL so we don't hold it in memory forever
      await this.redis.set(`blacklist:${jti}`, '1', 'EX', ttl)
    }
  }
}
