import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '@app/config/configuration';
import { ClsModule } from '@app/cls/cls.module';
import { Namespace } from 'cls-hooked';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { Sequelize as SequelizeStatic } from 'sequelize-typescript'
import * as models from '@app/database/models'
import { RequestStoreMiddleware } from '@app/auth/request-store.middleware';
import { afterConnect } from '@app/database/hooks';
import { AuthModule } from '@app/auth/auth.module';
import { VerificationModule } from '@app/verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ClsModule,
    SequelizeModule.forRootAsync({
      imports: [ConfigModule, ClsModule],
      useFactory: (configService: ConfigService, namespace: Namespace): SequelizeModuleOptions => {
        SequelizeStatic.useCLS(namespace)
        const { host, port, username, password, database } = configService.get('database')
        return {
          dialect: 'postgres',
          host,
          database,
          username,
          password,
          port,
          define: {
            underscored: true,
            whereMergeStrategy: 'and',
          },
          hooks: {
            afterConnect
          },
          models: Object.values(models),
        }
      },
      inject: [ConfigService, 'CLS_NAMESPACE'],
    }),
    AuthModule,
    VerificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestStoreMiddleware).forRoutes('*')
  }
}
