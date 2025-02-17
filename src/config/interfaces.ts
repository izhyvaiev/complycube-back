export interface IConfig {
    complyCube: {
      apiKey: string;
      webhookEndpoint: string;
    },
  jwt: {
    secret: string;
    ttl: number;
    refreshTtl: number;
  },
  environment: {
    isProduction: boolean
    isDevelopment: boolean
    isTest: boolean
    name: string
  },
  database: {
    host: string
    port: number
    username: string
    password: string
    database: string
  },
  web: {
    domain: string
  }
}