import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('Express App', () => {
  it('should respond to GET /health with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('should parse JSON request bodies', async () => {
    // POST to a non-existent route to verify JSON parsing doesn't crash
    const res = await request(app)
      .post('/nonexistent')
      .send({ test: 'data' })
      .set('Content-Type', 'application/json');
    expect(res.status).toBe(404);
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not Found' });
  });

  it('should set CORS headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
