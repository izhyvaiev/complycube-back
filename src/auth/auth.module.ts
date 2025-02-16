import { APP_GUARD } from '@nestjs/core'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthHandlerGuard } from '@app/auth/auth-handler.guard'
import { AuthService } from '@app/auth/auth.service'
import { SequelizeModule } from '@nestjs/sequelize'
import { AuthController } from '@app/auth/auth.controller'
import type { JwtModuleOptions } from '@nestjs/jwt'
import { JwtModule } from '@nestjs/jwt'
import { RefreshToken } from '@app/database/models';

@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const { secret } = configService.get('jwt')
        return {
          global: true,
          secret,
          signOptions: { expiresIn: '1h' },
        }
      },
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthHandlerGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
