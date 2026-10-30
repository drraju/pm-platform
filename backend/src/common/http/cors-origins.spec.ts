import { resolveCorsOrigins } from './cors-origins';

describe('resolveCorsOrigins', () => {
  it('allows both local hosts when the UI is served from localhost', () => {
    expect(resolveCorsOrigins('http://localhost:3000')).toEqual([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
  });

  it('allows both local hosts when the UI is served from 127.0.0.1', () => {
    expect(resolveCorsOrigins('http://127.0.0.1:3000')).toEqual([
      'http://127.0.0.1:3000',
      'http://localhost:3000',
    ]);
  });

  it('keeps a single configured origin outside local development', () => {
    expect(resolveCorsOrigins('https://pm.example.com')).toEqual([
      'https://pm.example.com',
    ]);
  });
});
