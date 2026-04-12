import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  // Run E2E suites sequentially — they share a database and
  // parallel beforeEach deleteMany() causes FK race conditions
  maxWorkers: 1,
  moduleNameMapper: {
    '^@flowboard/shared$': '<rootDir>/../../packages/shared/src',
    '^@flowboard/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1',
  },
};

export default config;
