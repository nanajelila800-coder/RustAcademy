import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppController } from './app.controller';
import { AppService } from './app.service';

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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should return a stable error code and field details for invalid DTO payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/example')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
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
});
