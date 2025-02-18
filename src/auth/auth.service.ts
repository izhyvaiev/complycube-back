import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWTPayload } from '@app/auth/types';
import { ConfigService } from '@nestjs/config';
import * as dayjs from 'dayjs'
import { SessionResponseDto } from '@app/complycube-shared/auth/session-response.dto';
import { randomUUID } from 'crypto'
import { InjectModel } from '@nestjs/sequelize';
import { Client, RefreshToken, VerificationSession } from '@app/database/models';
import { ModelCtor } from 'sequelize-typescript';
import { RefreshTokenDto } from '@app/complycube-shared/auth/refresh-token.dto';
import { Op } from 'sequelize';
import { Transaction } from '@app/database/decorators/transaction.decorator';
import { fillDto } from '@app/helpers';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(RefreshToken) private readonly refreshTokenModel: ModelCtor<RefreshToken>,
    @InjectModel(VerificationSession) private readonly verificationSessionModel: ModelCtor<VerificationSession>,
  ) {}

  public async generateSession(): Promise<SessionResponseDto> {
    return this.generateAccessToken(randomUUID())
  }

  public async continueSession(sessionId: string, email: string): Promise<SessionResponseDto> {
    const session = await this.verificationSessionModel.findOne({
      where: { uuid: sessionId },
      include: {
        model: Client,
        as: 'client',
        required: true,
        where: { email }
      }
    })
    if (!session) {
      throw new UnauthorizedException('Session not found')
    }
    return this.generateAccessToken(session.uuid)
  }

  @Transaction()
  public async refreshToken(payload: RefreshTokenDto): Promise<SessionResponseDto> {
    const refreshToken = await this.refreshTokenModel.findOne({
      where: {
        token: payload.refreshToken,
        expiresAt: { [Op.gte]: new Date() }
      }
    })
    if (!refreshToken) {
      throw new BadRequestException('Invalid refresh token');
    }
    const newSession = await this.generateAccessToken(refreshToken.sessionId)
    await refreshToken.destroy()
    return newSession
  }

  private async generateAccessToken(sessionId: string): Promise<SessionResponseDto> {
    const payload: JWTPayload = { sessionId }

    const expiresIn = this.config.get('jwt.ttl');

    const refreshToken = await this.generateRefreshToken(sessionId)

    return fillDto(SessionResponseDto, {
      access_token: this.jwtService.sign(payload, {
        expiresIn,
      }),
      token_type: 'bearer',
      expires_at: dayjs().add(expiresIn, 'seconds').toISOString(),
      refresh_token: refreshToken.token,
      refresh_token_expires_at: refreshToken.expiresAt.toISOString(),
    })
  }

  /**
   * Typically I'd store refresh tokens in redis
   * as redis provides perfect api for data expiration and key-value storage
   * But due to the limited free time I have to complete this task
   * It will be stored in Postgres
   */
  private async generateRefreshToken(sessionId: string): Promise<RefreshToken> {
    return this.refreshTokenModel.create({
      sessionId,
      token: randomUUID(),
      expiresAt: dayjs().add(this.config.get('jwt.refreshTtl'), 'second').toDate()
    })
  }
}