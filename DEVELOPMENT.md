# Development Guide

This guide covers local development setup for the PostgreSQL Branch Manager.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/chad3814/postgres-branch-manager.git
cd postgres-branch-manager

# 2. Install dependencies
npm install

# 3. Start the development databases
npm run dev:db

# 4. Start the API server in development mode
npm run dev
```

Your development environment is now running:
- **API Server**: http://localhost:3001
- **Database Admin**: http://localhost:8080 (Adminer)
- **PostgreSQL**: localhost:5432 (main dev DB)
- **PostgreSQL Test**: localhost:5433 (test DB)

## Development Environment

### Services Included

| Service | Port | Purpose | Credentials |
|---------|------|---------|-------------|
| **PostgreSQL (Dev)** | 5432 | Main development database | postgres/postgres |
| **PostgreSQL (Test)** | 5433 | Test database for automated tests | postgres/postgres |
| **Adminer** | 8080 | Database management UI | postgres/postgres |
| **Redis** | 6379 | Optional caching (future use) | No auth |
| **Branch Manager API** | 3001 | Development API server | API key: `dev-api-key-123` |

### Pre-populated Test Data

The development environment comes with sample databases:

- **`sample_app_production`**: Realistic app data with users, posts, categories
- **`sample_app_staging`**: Smaller staging dataset
- **`branch_manager_dev`**: Branch metadata tracking

## Available npm Scripts

### Development
```bash
npm run dev              # Start API server with hot reload
npm run dev:cli          # Run CLI tool in development mode
npm run dev:db           # Start only databases and adminer
npm run dev:all          # Start all services including API in container
npm run dev:down         # Stop all development services
npm run dev:logs         # View logs from all services
npm run dev:reset        # Reset databases (destroys all data!)
```

### Testing
```bash
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

### Linting & Building
```bash
npm run lint             # Check code style
npm run lint:fix         # Fix auto-fixable lint issues
npm run build            # Build for production
```

## Development Workflow

### 1. Basic Development Setup

```bash
# Start databases
npm run dev:db

# In another terminal, start the API server
npm run dev

# Test the CLI tool
npm run dev:cli -- --help
```

### 2. Testing Branch Operations

Use the included test scenarios:

```bash
# Run interactive test scenarios
./dev/test-scenarios.sh

# Or run specific scenarios
./dev/test-scenarios.sh  # Choose from menu
```

### 3. Database Management

**Access Adminer UI**: http://localhost:8080
- Server: `postgres`
- Username: `postgres` 
- Password: `postgres`
- Database: `branch_manager_dev` (or any other)

**Load additional test data**:
```bash
docker exec -i branch-manager-postgres-dev psql -U postgres < dev/test-data.sql
```

### 4. API Development

The development API server runs with hot reload. Test endpoints:

```bash
# Health check
curl http://localhost:3001/health

# List branches (with dev API key)
curl -H "x-api-key: dev-api-key-123" http://localhost:3001/api/branches

# Create a branch
curl -X POST -H "Content-Type: application/json" -H "x-api-key: dev-api-key-123" \
  http://localhost:3001/api/branches \
  -d '{"name": "test_branch", "sourceDatabase": "sample_app_production"}'
```

## Environment Variables

Development environment variables are in `.env.dev`:

```bash
# Copy to create your local config
cp .env.dev .env.local

# Key variables:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/branch_manager_dev
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/branch_manager_test
BRANCH_MANAGEMENT_API_KEY=dev-api-key-123
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
# Ensure test database is running
npm run dev:db

# Run integration tests
npm run test:coverage
```

### Manual Testing Scenarios

Run the comprehensive test scenarios:

```bash
./dev/test-scenarios.sh
```

This includes:
1. **Basic Operations**: Create, list, delete branches
2. **Multiple Sources**: Branch from different databases  
3. **Branch Management**: Pattern matching, cleanup
4. **Error Handling**: Invalid inputs, duplicates
5. **Performance**: Batch operations, timing

## Debugging

### Server Debugging
The dev server runs with TypeScript and hot reload via `tsx watch`.

### Database Debugging
- Use Adminer UI for visual database exploration
- Check container logs: `npm run dev:logs`
- Connect directly: `psql postgresql://postgres:postgres@localhost:5432/branch_manager_dev`

### CLI Debugging
Add `--verbose` flag to any CLI command for detailed output:
```bash
npm run dev:cli -- create test_branch --source sample_app_production --verbose
```

## Common Development Tasks

### Adding New Features

1. **Add API endpoint** in `src/server.ts`
2. **Add CLI command** in `src/cli.ts`  
3. **Update core logic** in `src/index.ts`
4. **Add tests** in `__tests__/`
5. **Test manually** with test scenarios

### Testing Database Changes

1. **Reset development data**:
   ```bash
   npm run dev:reset
   ```

2. **Load fresh test data**:
   ```bash
   docker exec -i branch-manager-postgres-dev psql -U postgres < dev/test-data.sql
   ```

3. **Test operations**:
   ```bash
   ./dev/test-scenarios.sh
   ```

### Performance Testing

Monitor branch creation/deletion performance:

```bash
# Time branch operations
time npm run dev:cli -- create perf_test --source sample_app_production

# Monitor resource usage
docker stats branch-manager-postgres-dev
```

## Troubleshooting

### Port Conflicts
If ports 5432, 5433, or 8080 are in use:
1. Edit `docker-compose.dev.yml` to use different ports
2. Update `.env.dev` with new ports

### Database Connection Issues
```bash
# Check if containers are running
docker ps

# Restart databases
npm run dev:down
npm run dev:db

# Check database logs
docker logs branch-manager-postgres-dev
```

### CLI Not Working
```bash
# Ensure dependencies are installed
npm install

# Check if TypeScript compiles
npm run build

# Run CLI directly
npx tsx src/cli.ts --help
```

## Production Testing

Test production builds locally:

```bash
# Build production version
npm run build

# Test production CLI
node dist/cli.js --help

# Test production server  
node dist/server.js
```

## Contributing

1. **Setup development environment** (this guide)
2. **Make changes** with tests
3. **Run test scenarios** to verify functionality
4. **Check code style**: `npm run lint:fix`
5. **Verify build**: `npm run build`
6. **Submit PR** with description of changes

## Resources

- **Database Admin**: http://localhost:8080
- **API Docs**: http://localhost:3001 (when running)
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Docker Compose Docs**: https://docs.docker.com/compose/