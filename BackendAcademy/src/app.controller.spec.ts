import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

class TestRequestCorrelationFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();
    const requestId = (req.headers['x-request-id'] as string) ?? 'test-request-id';

    if (exception instanceof BadRequestException) {
      const payload = exception.getResponse();
      const normalized = typeof payload === 'string' ? { message: payload } : payload;

      return res.status(exception.getStatus()).json({
        ...(typeof normalized === 'object' && normalized !== null ? normalized : { message: String(normalized) }),
        request_id: requestId,
        correlationId: requestId,
      });
    }

    return res.status(500).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      request_id: requestId,
      correlationId: requestId,
    });
  }
}

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it('should return the service greeting', () => {
    expect(appController.getHello()).toBe('RustAcademy BackendAcademy API');
  });
});

describe('DTO validation responses', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req, res, next) => {
      const requestId = (req.headers['x-request-id'] as string) ?? 'test-request-id';
      req.headers['x-request-id'] = requestId;
      res.setHeader('x-request-id', requestId);
      res.setHeader('x-correlation-id', requestId);
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) =>
          new BadRequestException({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fields: errors.map((error) => ({
              field: error.property,
              errors: Object.values(error.constraints ?? {}),
            })),
          }),
      }),
    );
    app.useGlobalFilters(new TestRequestCorrelationFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return a stable error code and field details for invalid DTO payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/example')
      .set('x-request-id', 'req-123')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.headers['x-request-id']).toBe('req-123');
    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      request_id: 'req-123',
      correlationId: 'req-123',
    });
    expect(response.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'name',
          errors: expect.arrayContaining([expect.stringContaining('required')]),
        }),
        expect.objectContaining({
          field: 'email',
          errors: expect.arrayContaining([expect.stringContaining('valid email')]),
        }),
      ]),
    );
  });

  it('should return a safe 400 response for malformed JSON payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/example')
      .set('Content-Type', 'application/json')
      .set('x-request-id', 'req-456')
      .send('{invalid-json')
      .expect(400);

    expect(response.headers['x-request-id']).toBe('req-456');
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Malformed JSON payload',
      request_id: 'req-456',
      correlationId: 'req-456',
      fields: [{ field: 'body', errors: ['Invalid JSON syntax'] }],
    });
  });
});
