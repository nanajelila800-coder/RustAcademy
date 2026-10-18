import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppModule } from './app.module';
import request from 'supertest';
import { HealthController } from './health/health.controller';
import { DEFAULT_HEALTH_PROBE, resolveHealthProbe } from './health/coverage';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  describe('getHello', () => {
    it('should return the service greeting', () => {
      expect(appController.getHello()).toBe('RustAcademy BackendAcademy API');
    });
  });
});

describe('HealthController probe validation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should default to the standard liveness probe when no probe option is provided', () => {
    expect(resolveHealthProbe()).toBe(DEFAULT_HEALTH_PROBE);

    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('ok');
        expect(body.probe).toBe(DEFAULT_HEALTH_PROBE);
      });
  });

  it('should accept supported health probe aliases', async () => {
    const responses = await Promise.all([
      request(app.getHttpServer()).get('/health?probe=live').expect(200),
      request(app.getHttpServer()).get('/health?probe=ready').expect(200),
      request(app.getHttpServer()).get('/health?probe=start').expect(200),
    ]);

    expect(responses.map(({ body }) => body.probe)).toEqual([
      'liveness',
      'readiness',
      'startup',
    ]);
  });

  it('should reject unsupported probe options with 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/health?probe=bogus')
      .expect(400);

    expect(response.body.message).toContain('Unsupported probe option');
  });
});

describe('Request body size limit (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reject oversized JSON bodies with 413 Payload Too Large', async () => {
    const oversizedPayload = { data: 'x'.repeat(2 * 1024 * 1024) };

    const response = await request(app.getHttpServer())
      .post('/api/test')
      .send(oversizedPayload)
      .expect(413);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('payload too large');
  });

  it('should accept JSON bodies within the size limit', async () => {
    const validPayload = { data: 'x'.repeat(100) };

    const response = await request(app.getHttpServer())
      .post('/api/test')
      .send(validPayload);

    expect(response.status).not.toBe(413);
  });
});
