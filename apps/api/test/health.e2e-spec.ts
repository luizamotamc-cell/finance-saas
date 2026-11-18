import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from './helpers';

describe('Health check', () => {
  let app: INestApplication;
  beforeAll(async () => { app = await createApp(); });
  afterAll(() => app.close());

  it('responde 200 sem precisar de login', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
