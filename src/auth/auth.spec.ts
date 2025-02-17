import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/sequelize';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RefreshToken } from '@app/database/models/refresh-token';
import { VerificationSession } from '@app/database/models/verification-session';
import { SessionResponseDto } from '@app/complycube-shared/auth/session-response.dto';
import * as dayjs from 'dayjs';
import { Sequelize } from 'sequelize-typescript';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let refreshTokenModel: typeof RefreshToken;
  let verificationSessionModel: typeof VerificationSession;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: getModelToken(RefreshToken), useValue: { create: jest.fn(), findOne: jest.fn() } },
        { provide: getModelToken(VerificationSession), useValue: { findOne: jest.fn() } },
        {
          provide: Sequelize,
          useValue: {
            transaction: (fn: any) => fn()
          },
        },
        {
          provide: "CLS_NAMESPACE",
          useValue: {get: jest.fn(), set: jest.fn()},
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    refreshTokenModel = module.get<typeof RefreshToken>(getModelToken(RefreshToken));
    verificationSessionModel = module.get<typeof VerificationSession>(getModelToken(VerificationSession));
  });

  describe('generateSession', () => {
    it('should generate a session and return SessionResponseDto', async () => {
      // @ts-ignore private method in TS, but public after compilation anyway
      jest.spyOn(authService, 'generateAccessToken').mockResolvedValueOnce({} as SessionResponseDto);

      const result = await authService.generateSession();

      // @ts-ignore private method in TS, but public after compilation anyway
      expect(authService.generateAccessToken).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('continueSession', () => {
    it('should continue session successfully', async () => {
      const mockSession = { uuid: 'test-uuid', client: { email: 'test@mail.com' } };
      jest.spyOn(verificationSessionModel, 'findOne').mockResolvedValueOnce(mockSession as any);
      // @ts-ignore private method in TS, but public after compilation anyway
      jest.spyOn(authService, 'generateAccessToken').mockResolvedValueOnce({} as SessionResponseDto);

      const result = await authService.continueSession('test-uuid', 'test@mail.com');

      expect(verificationSessionModel.findOne).toHaveBeenCalledWith({
        where: { uuid: 'test-uuid' },
        include: {
          model: expect.anything(),
          as: 'client',
          required: true,
          where: { email: 'test@mail.com' },
        },
      });
      // @ts-ignore private method in TS, but public after compilation anyway
      expect(authService.generateAccessToken).toHaveBeenCalledWith('test-uuid');
      expect(result).toBeDefined();
    });

    it('should throw UnauthorizedException if session is not found', async () => {
      jest.spyOn(verificationSessionModel, 'findOne').mockResolvedValueOnce(null);

      await expect(authService.continueSession('test-uuid', 'test@mail.com')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshToken = {
        token: 'test-refresh-token',
        sessionId: 'test-session-id',
        expiresAt: dayjs().add(1, 'hour').toDate(),
        destroy: jest.fn(),
      };
      jest.spyOn(refreshTokenModel, 'findOne').mockResolvedValueOnce(mockRefreshToken as any);
      // @ts-ignore private method in TS, but public after compilation anyway
      jest.spyOn(authService, 'generateAccessToken').mockResolvedValueOnce({} as SessionResponseDto);

      const result = await authService.refreshToken({ refreshToken: 'test-refresh-token' });

      expect(refreshTokenModel.findOne).toHaveBeenCalledWith({
        where: {
          token: 'test-refresh-token',
          expiresAt: { [Symbol.for('gte')]: expect.any(Date) },
        },
      });
      // @ts-ignore private method in TS, but public after compilation anyway
      expect(authService.generateAccessToken).toHaveBeenCalledWith('test-session-id');
      expect(mockRefreshToken.destroy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException for invalid refresh token', async () => {
      jest.spyOn(refreshTokenModel, 'findOne').mockResolvedValueOnce(null);

      await expect(authService.refreshToken({ refreshToken: 'invalid-refresh-token' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate access token and return SessionResponseDto', async () => {
      const mockRefreshToken = {
        token: 'refresh-token',
        expiresAt: dayjs().add(30, 'days').toDate(),
      };
      jest.spyOn(authService as any, 'generateRefreshToken').mockResolvedValueOnce(mockRefreshToken);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce('access-token');
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'jwt.ttl') return 3600;
        if (key === 'jwt.refreshTtl') return 86400;
      });

      const result = await (authService as any).generateAccessToken('session-id');

      expect(jwtService.sign).toHaveBeenCalledWith({ sessionId: 'session-id' }, { expiresIn: 3600 });
      expect(result).toEqual(expect.objectContaining({
        access_token: 'access-token',
        token_type: 'bearer',
        expires_at: expect.any(String),
        refresh_token: 'refresh-token',
        refresh_token_expires_at: expect.any(String),
      }));
    });
  });
});