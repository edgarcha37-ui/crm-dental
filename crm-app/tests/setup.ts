import { vi } from 'vitest';

// Las variables que la app espera en runtime — valores fake para tests.
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
process.env.SESSION_SECRET = 'test-session-secret-min-32-chars-1234';
process.env.INTERNAL_API_KEY = 'test-internal-key';

// Silenciar logs en tests
vi.mock('@/lib/logger', () => ({
  logApiError: vi.fn(),
  logApiInfo: vi.fn(),
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
