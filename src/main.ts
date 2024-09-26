import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3001', // Разрешить запросы только с этого домена
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true, // Разрешить отправку куки и заголовков авторизации
  });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  await app.listen(5000, () => {
    console.log('start');
  });
}
bootstrap();
