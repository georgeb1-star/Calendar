import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^../lib/prisma$': '<rootDir>/src/__tests__/__mocks__/prisma.ts',
    '^../../lib/prisma$': '<rootDir>/src/__tests__/__mocks__/prisma.ts',
    '^../../../lib/prisma$': '<rootDir>/src/__tests__/__mocks__/prisma.ts',
  },
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  clearMocks: true,
};

export default config;
