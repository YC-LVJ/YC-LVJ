# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YC-LVJ is a Hydro fork designed for BNUYC (北师大盐城附属学校), a custom online judge system maintained by the LVJ team. It's based on Hydro and is not officially supported by the original Hydro team.

## Development Commands

### Build & Development
- `yarn build` - Build TypeScript code (runs prepare script then tsc)
- `yarn build:watch` - Build with watch mode for development
- `yarn build:ui` - Build the UI interface
- `yarn build:ui:dev` - Build UI in development mode with hot reload
- `yarn build:ui:production` - Build UI for production with optimizations

### Testing & Quality
- `yarn test` - Run the test suite
- `yarn benchmark` - Run performance benchmarks
- `yarn lint` - Run ESLint with auto-fix
- `yarn lint:ci` - Run ESLint for CI (no fixes, max-warnings=0)

### Running the Application
- `yarn start` - Start HydroOJ server
- `yarn debug` - Start with debug mode and template enabled

## Architecture

### Monorepo Structure
This is a Yarn workspace monorepo with the following structure:

- **packages/** - Core packages and modules
- **plugins/** - Plugin system components (currently minimal)
- **modules/** - Module components (currently minimal)

### Key Packages

#### Core Package (packages/hydrooj)
- Main server application using Koa.js framework
- Binary: `packages/hydrooj/bin/hydrooj.js`
- Main entry: `packages/hydrooj/src/init.ts`
- Plugin API: `packages/hydrooj/src/plugin-api.ts`
- Key components: context, error handling, interface definitions

#### Utils Package (packages/utils)
- Shared utilities: `@hydrooj/utils`
- Main: `packages/utils/lib/utils.ts`
- Contains MongoDB integration, logging, system information

#### UI Package (packages/ui-default)
- Frontend interface (React-based)
- Separate build process with Gulp and webpack
- Development and production builds

#### Judge System
- **judge-server** (`packages/judge-server`): Judging server component
- **judge-client** (`packages/judge-client`): Client for executing submissions

#### Additional Packages
- **import-hoj/**: Import tools for HOJ systems
- **import-qduoj/**: Import tools for QDUOJ systems
- **vjudge/**: Virtual Judge functionality
- **blog/**: Blog functionality
- **migrate/**: Database migration tools

### Technology Stack
- **Backend**: Node.js 18+, TypeScript, Koa.js, MongoDB
- **Frontend**: React, TypeScript, Webpack/Gulp
- **Testing**: Chai, Supertest
- **Build**: TypeScript compiler, esbuild, ESLint
- **Package Manager**: Yarn with workspaces

### Plugin System
- Uses a hook-based module resolution system
- Plugins are loaded from `~/.hydro/addons` directory
- Custom require resolution for hydrooj and @hydrooj packages

## Important Notes

- This is a fork of Hydro with custom modifications for BNUYC
- Node.js 18+ is required
- Uses workspace references in TypeScript configuration
- Main binary handles pnpm path resolution for better error stack traces
- Development builds include source maps and watch mode
- Production builds are optimized with increased memory allocation

## Configuration

- Main config in `package.json` (workspace setup)
- TypeScript config: `tsconfig.json` and `tsconfig.ui.json`
- Custom require hooks in binary for workspace resolution