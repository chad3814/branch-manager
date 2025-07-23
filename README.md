# PostgreSQL Branch Manager

A powerful tool for creating and managing PostgreSQL database branches using copy-on-write functionality via database templates. Perfect for GitOps workflows, PR environments, and development/testing isolation.

## Features

- ⚡ **Instant Branching**: Use PostgreSQL's `CREATE DATABASE ... WITH TEMPLATE` for true copy-on-write branching
- 🔧 **CLI Tool**: Easy-to-use command-line interface for all operations
- 🌐 **REST API**: HTTP API for integration with CI/CD pipelines
- 🐳 **Docker Ready**: Containerized deployment with Docker Compose
- 🔒 **Secure**: API key authentication for production environments
- 📊 **Monitoring**: Branch listing with size and connection information
- 🧹 **Auto Cleanup**: Automated cleanup of old/unused branches

## Quick Start

### Installation

```bash
# Install globally via npm
npm install -g @chad3814/postgres-branch-manager

# Or use via npx
npx @chad3814/postgres-branch-manager --help
```

### CLI Usage

```bash
# Set your database URL
export DATABASE_URL="postgresql://user:pass@localhost:5432/production_db"

# Create a new branch
pg-branch create my-feature --source production_db

# List all branches
pg-branch list

# Check if a branch exists
pg-branch exists my-feature

# Delete a branch
pg-branch delete my-feature

# Clean up old branches
pg-branch cleanup --dry-run
```

### API Server

```bash
# Start the API server
npm start

# Or with Docker
docker-compose up
```

#### API Endpoints

- `GET /api/branches` - List all branches
- `POST /api/branches` - Create a new branch
- `DELETE /api/branches/:name` - Delete a branch
- `GET /api/branches/:name/exists` - Check if branch exists
- `POST /api/branches/cleanup` - Cleanup old branches

## Configuration

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/production_db"

# Optional
DB_PREFIX="branch_"                    # Default prefix for branch names
PORT=3001                             # API server port
NODE_ENV="production"                 # Environment mode
BRANCH_MANAGEMENT_API_KEY="secret"    # API authentication key
SOURCE_DATABASE="production_db"       # Default source database
```

## GitOps Integration

### GitHub Actions Example

```yaml
- name: Setup Branch Manager
  run: |
    npm install -g @chad3814/postgres-branch-manager

- name: Create PR Database
  run: |
    pg-branch create pr-${{ github.event.number }} \
      --source production \
      --url "${{ secrets.DATABASE_URL }}" \
      --verbose
```

### Docker Compose

```yaml
version: '3.8'
services:
  branch-manager:
    image: ghcr.io/chad3814/postgres-branch-manager:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - BRANCH_MANAGEMENT_API_KEY=${API_KEY}
```

## How It Works

1. **Template-Based Branching**: Uses PostgreSQL's native `CREATE DATABASE ... WITH TEMPLATE` command
2. **Copy-on-Write**: New branches share data pages with the source until modifications occur
3. **Instant Creation**: Large databases can be branched in seconds
4. **True Isolation**: Each branch is a completely separate database
5. **Efficient Storage**: Only modified pages consume additional space

## Use Cases

### Development Workflows
- **Feature Branches**: Create isolated databases for feature development
- **Testing**: Run tests against production-like data without risk
- **Experimentation**: Try schema changes safely

### GitOps/CI/CD
- **PR Environments**: Automatic database creation for pull requests
- **Staging Deployments**: Quick staging environment setup
- **Migration Testing**: Test database migrations on real data

### Data Operations
- **Backup/Restore**: Create point-in-time snapshots
- **Data Analysis**: Work with production data copies
- **Training**: Provide isolated environments for training

## API Reference

### Create Branch
```bash
curl -X POST http://localhost:3001/api/branches \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"name": "feature-branch", "sourceDatabase": "production"}'
```

### List Branches
```bash
curl http://localhost:3001/api/branches \
  -H "x-api-key: your-api-key"
```

### Delete Branch
```bash
curl -X DELETE http://localhost:3001/api/branches/feature-branch \
  -H "x-api-key: your-api-key"
```

## Development

```bash
# Clone the repository
git clone https://github.com/chad3814/postgres-branch-manager.git
cd postgres-branch-manager

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Requirements

- PostgreSQL 10+
- Node.js 18+
- Sufficient disk space for branched databases

## Security Considerations

- Use strong API keys in production
- Limit network access to the API server
- Monitor disk space usage
- Regular cleanup of unused branches
- Secure your PostgreSQL credentials

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/chad3814/postgres-branch-manager/wiki)
- 🐛 [Issues](https://github.com/chad3814/postgres-branch-manager/issues)
- 💬 [Discussions](https://github.com/chad3814/postgres-branch-manager/discussions)