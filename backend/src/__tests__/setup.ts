// Runs before any test module is imported.
// Override env vars so app.ts / services use predictable test values.
process.env.JWT_SECRET = 'test-secret';
process.env.EMAIL_TEST_MODE = 'true';
process.env.NODE_ENV = 'test';
