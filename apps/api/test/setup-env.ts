// Banco de TESTE separado. Nunca aponte para o banco de desenvolvimento:
// os testes criam usuários e dados de verdade.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://finance:finance@localhost:5433/finance_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789abcdef';
process.env.THROTTLE_DISABLED = 'true'; // os testes criam muitos usuários do mesmo IP
