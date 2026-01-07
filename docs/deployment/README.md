# Deployment Guide

This guide covers deploying the Google Workspace MCP Multi-Server Platform to production.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Docker Deployment](#docker-deployment)
4. [GitHub Actions CI/CD](#github-actions-cicd)
5. [Environment Configuration](#environment-configuration)
6. [Health Checks](#health-checks)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The platform consists of 5 MCP servers that run as separate Docker containers:

- **mcp-program** (port 3001) - Program Management
- **mcp-deliverables** (port 3002) - Deliverable Tracking
- **mcp-subcontract** (port 3003) - Subcontract Management
- **mcp-compliance** (port 3004) - Compliance & Risk
- **mcp-financial** (port 3005) - Financial Management

Plus supporting infrastructure:
- **Redis** (port 6379) - Event bus and caching

---

## Prerequisites

### Required Software

- Docker 24.0+ and Docker Compose 2.0+
- Node.js 20.x (for local development)
- Git

### Required Credentials

- Google Cloud Service Account credentials (credentials.json)
- Google OAuth2 token (token.json)
- Google Sheets spreadsheet IDs for each domain

### Required Secrets

For GitHub Actions deployment:
```
CODECOV_TOKEN
GOOGLE_CREDENTIALS
GOOGLE_TOKEN
PROGRAM_SPREADSHEET_ID
DELIVERABLES_SPREADSHEET_ID
SUBCONTRACT_SPREADSHEET_ID
COMPLIANCE_SPREADSHEET_ID
FINANCIAL_SPREADSHEET_ID
DOCKER_USERNAME
DOCKER_PASSWORD
```

---

## Docker Deployment

### Local Development with Docker Compose

**1. Build all servers:**
```bash
npm run build
```

**2. Create environment file:**
```bash
cat > .env << EOF
PROGRAM_SPREADSHEET_ID=your-program-spreadsheet-id
DELIVERABLES_SPREADSHEET_ID=your-deliverables-spreadsheet-id
SUBCONTRACT_SPREADSHEET_ID=your-subcontract-spreadsheet-id
COMPLIANCE_SPREADSHEET_ID=your-compliance-spreadsheet-id
FINANCIAL_SPREADSHEET_ID=your-financial-spreadsheet-id
EOF
```

**3. Start all services:**
```bash
cd docker
docker-compose up -d
```

**4. Verify services:**
```bash
docker-compose ps
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

**5. View logs:**
```bash
docker-compose logs -f mcp-program
docker-compose logs -f mcp-financial
```

**6. Stop all services:**
```bash
docker-compose down
```

---

### Building Individual Docker Images

**Build a single server:**
```bash
docker build -f docker/Dockerfile.mcp-program -t google-workspace-mcp-program:latest .
```

**Run a single container:**
```bash
docker run -d \
  --name mcp-program \
  -p 3001:3001 \
  -e PROGRAM_SPREADSHEET_ID=your-id \
  -e NODE_ENV=production \
  -v $(pwd)/credentials.json:/app/credentials.json:ro \
  -v $(pwd)/token.json:/app/token.json:ro \
  google-workspace-mcp-program:latest
```

---

## GitHub Actions CI/CD

### Automated Testing

**On every PR to main/develop:**
1. Linting checks
2. Build all packages
3. Unit tests (Node 18.x & 20.x)
4. Integration tests
5. E2E tests
6. Coverage reporting

**Workflow file:** `.github/workflows/test.yml`

**To trigger manually:**
- Go to Actions tab in GitHub
- Select "Tests" workflow
- Click "Run workflow"

---

### Automated Deployment

**Staging Deployment (automatic):**
- Trigger: Push to `main` branch
- Steps:
  1. Run all tests
  2. Build Docker images
  3. Deploy to staging environment
  4. Run smoke tests

**Production Deployment (automatic):**
- Trigger: Create version tag (e.g., `v1.0.0`)
- Steps:
  1. Run all tests
  2. Build Docker images
  3. Deploy to staging
  4. Verify staging
  5. Deploy to production
  6. Run smoke tests
  7. Create GitHub Release

**Manual Deployment:**
```bash
# Go to Actions → Deploy workflow → Run workflow
# Choose environment: staging or production
```

**Create a production release:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

**Workflow file:** `.github/workflows/deploy.yml`

---

## Environment Configuration

### Environment Variables

Each server requires these environment variables:

**Common:**
```bash
NODE_ENV=production
PORT=300X
CREDENTIALS_PATH=/app/credentials.json
TOKEN_PATH=/app/token.json
REDIS_URL=redis://redis:6379
```

**Server-specific:**
```bash
# mcp-program
PROGRAM_SPREADSHEET_ID=spreadsheet-id

# mcp-deliverables
DELIVERABLES_SPREADSHEET_ID=spreadsheet-id

# mcp-subcontract
SUBCONTRACT_SPREADSHEET_ID=spreadsheet-id

# mcp-compliance
COMPLIANCE_SPREADSHEET_ID=spreadsheet-id

# mcp-financial
FINANCIAL_SPREADSHEET_ID=spreadsheet-id
```

### Google Credentials

**Service Account Setup:**
1. Create service account in Google Cloud Console
2. Enable APIs: Sheets, Drive, Docs, Gmail, Calendar
3. Download credentials.json
4. Share spreadsheets with service account email

**OAuth2 Token Setup:**
1. Run setup script locally: `npm run setup-auth`
2. Complete OAuth flow in browser
3. token.json will be generated
4. Upload to production secrets

---

## Health Checks

### Health Check Endpoints

All servers expose `/health` endpoint:

**Response format:**
```json
{
  "status": "healthy",
  "server": "mcp-program",
  "version": "1.0.0",
  "timestamp": "2026-01-05T12:00:00.000Z"
}
```

**Status values:**
- `healthy` - All systems operational
- `degraded` - Partial functionality
- `unhealthy` - Critical issues

### Docker Health Checks

Each container has built-in health checks:
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3
- Start period: 40 seconds

**Check container health:**
```bash
docker ps
# Look for "(healthy)" in STATUS column
```

---

## Monitoring

### Recommended Monitoring Setup

**1. Application Metrics:**
- Health check monitoring (uptime)
- Response time tracking
- Error rate monitoring
- API call counts

**2. Infrastructure Metrics:**
- CPU usage per container
- Memory usage per container
- Network I/O
- Disk I/O

**3. Google Sheets API Metrics:**
- API call counts
- Rate limit tracking
- Error rates
- Quota usage

**4. Log Aggregation:**
- Centralized logging (e.g., ELK stack)
- Error tracking (e.g., Sentry)
- Performance monitoring (e.g., New Relic)

### Log Access

**Docker Compose:**
```bash
docker-compose logs -f --tail=100 mcp-program
```

**Individual container:**
```bash
docker logs -f mcp-program
```

**Export logs:**
```bash
docker logs mcp-program > program.log 2>&1
```

---

## Troubleshooting

### Server Won't Start

**Check logs:**
```bash
docker logs mcp-program
```

**Common issues:**
- Missing environment variables
- Invalid Google credentials
- Port already in use
- Insufficient memory

**Solutions:**
```bash
# Verify environment variables
docker exec mcp-program env | grep SPREADSHEET_ID

# Check port conflicts
lsof -i :3001

# Increase memory limit
docker update --memory=2g mcp-program
```

---

### Health Check Failing

**Symptoms:**
- Container shows "unhealthy" status
- Container keeps restarting

**Debug steps:**
```bash
# Check health check command
docker inspect mcp-program | grep -A 10 Healthcheck

# Test health endpoint manually
docker exec mcp-program curl http://localhost:3001/health

# Check application logs
docker logs mcp-program | tail -50
```

---

### Google Sheets API Errors

**Rate Limit Exceeded:**
```
Error: Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'
```

**Solution:**
- Implement exponential backoff
- Cache frequently accessed data
- Batch operations where possible
- Request quota increase from Google

**Invalid Credentials:**
```
Error: invalid_grant
```

**Solution:**
- Regenerate token.json: `npm run setup-auth`
- Verify service account has access to spreadsheets
- Check credentials.json is valid

---

### Memory Issues

**Out of Memory:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solutions:**
```bash
# Increase Node.js heap size
docker run -e NODE_OPTIONS="--max-old-space-size=4096" ...

# Increase Docker container memory
docker update --memory=4g mcp-program

# Check for memory leaks
docker stats mcp-program
```

---

### Network Issues

**Cannot connect to other servers:**

**Debug:**
```bash
# Check network connectivity
docker exec mcp-program ping mcp-financial

# Verify service registry
curl http://localhost:3001/api/services

# Check Redis connection
docker exec mcp-program redis-cli -h redis ping
```

**Solution:**
- Verify all containers on same network
- Check firewall rules
- Restart networking: `docker-compose down && docker-compose up`

---

## Rollback Procedure

### Automatic Rollback

GitHub Actions will automatically rollback on deployment failure.

### Manual Rollback

**Using Docker tags:**
```bash
# Stop current version
docker-compose down

# Pull previous version
docker pull yourname/google-workspace-mcp-program:v1.0.0

# Update docker-compose.yml to use specific version
# Restart services
docker-compose up -d
```

**Using git:**
```bash
# Checkout previous version
git checkout v1.0.0

# Rebuild and deploy
npm run build
docker-compose up -d --build
```

---

## Production Checklist

Before deploying to production:

- [ ] All tests passing in CI
- [ ] Environment variables configured
- [ ] Google credentials valid and uploaded
- [ ] Spreadsheets created and shared with service account
- [ ] Docker images built and pushed
- [ ] Health checks configured
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Rollback procedure documented
- [ ] Team trained on operations

---

## Support

For deployment issues:
1. Check server logs
2. Verify health endpoints
3. Review GitHub Actions logs
4. Check Google Sheets API quotas
5. Contact DevOps team

---

*Last Updated: January 5, 2026*
*Version: 1.0.0*
