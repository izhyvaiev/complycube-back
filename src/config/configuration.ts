import { IConfig } from './interfaces';
import { getInt } from '@app/config/helpers';
import * as process from 'node:process';

export default () => {
  const env = process.env.NODE_ENV || 'development'
  const environment = {
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isTest: env === 'test',
  }

  const config: IConfig ={
    complyCube: {
      apiKey: process.env.COMPLYCUBE_API_KEY,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      ttl: getInt(process.env.JWT_TTL, 1800),
      refreshTtl: getInt(process.env.JWT_REFRESH_TTL, 3600),
    },
    environment: {
      ...environment,
      name: env,
    },
    database: {
      host: process.env.DB_HOST,
      port: getInt(process.env.DB_PORT, 5432),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    web: {
      domain: process.env.WEB_DOMAIN
    }
  }

  return config;
}