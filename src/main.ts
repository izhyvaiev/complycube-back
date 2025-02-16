import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

  declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
      interface Request {
        sessionId?: string
      }
    }
  }

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true })
  const configService = app.get(ConfigService)
  const isProduction = configService.get('environment.isProduction') as boolean
  app.enableCors({
    origin: isProduction
      ? /^(https:\/\/)?(.*\.)?example\.(com|net)$/i
      : /^(https?:\/\/)?((.*\.)?example\.(com|net))|(localhost(:\d+)?)$/i,
  })
  app.useGlobalPipes(new ValidationPipe({ transform: true }))
  useContainer(app.select(AppModule), { fallbackOnErrors: true })

  const config = new DocumentBuilder()
    .setTitle('Verification API')
    .setDescription('The Document and Identity verification API using ComplyCube')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('ComplyCube')
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      defaultModelRendering: 'model',
      defaultModelsExpandDepth: -1,
      defaultModelExpandDepth: -1,
    },
  })

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
