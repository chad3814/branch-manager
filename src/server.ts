import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { DatabaseBranchManager } from './index';

function isDevelopment() {
    if (!process.env.NODE_ENV) {
        console.warn('NODE_ENV is not set, defaulting to development');
        return true;
    }
    return process.env.NODE_ENV === 'development';  
}

// Load environment variables
config({path: isDevelopment() ? '.env.dev' : '.env'});

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Authentication middleware
function authenticateRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (isDevelopment()) {
    return next();
  }
  
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.BRANCH_MANAGEMENT_API_KEY;
  
  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Valid API key required' });
  }
  
  next();
}

// Database manager instance
let manager: DatabaseBranchManager | null = null;

function getManager(): DatabaseBranchManager {
  if (!manager) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    manager = new DatabaseBranchManager({
      connectionUrl: databaseUrl,
      defaultPrefix: process.env.DB_PREFIX || 'db_'
    });
  }
  return manager;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// List branches
app.get('/api/branches', authenticateRequest, async (req, res) => {
  try {
    const pattern = req.query.pattern as string;
    const branches = await getManager().listBranches(pattern);
    
    res.json({ 
      branches,
      count: branches.length,
      pattern: pattern || 'default'
    });
  } catch (error) {
    console.error('Failed to list branches:', error);
    res.status(500).json({ 
      error: 'Failed to list database branches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create branch
app.post('/api/branches', authenticateRequest, async (req, res) => {
  try {
    const { name, sourceDatabase } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    if (!sourceDatabase) {
      return res.status(400).json({ error: 'Source database is required' });
    }
    
    const branchUrl = await getManager().createBranch({ name, sourceDatabase });
    
    res.status(201).json({ 
      success: true,
      branchName: name,
      sourceDatabase,
      connectionUrl: branchUrl,
      message: `Database branch '${name}' created successfully`
    });
  } catch (error) {
    console.error('Failed to create branch:', error);
    res.status(500).json({ 
      error: 'Failed to create database branch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete branch
app.delete('/api/branches/:name', authenticateRequest, async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    await getManager().deleteBranch(name);
    
    res.json({ 
      success: true,
      branchName: name,
      message: `Database branch '${name}' deleted successfully`
    });
  } catch (error) {
    console.error('Failed to delete branch:', error);
    res.status(500).json({ 
      error: 'Failed to delete database branch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if branch exists
app.get('/api/branches/:name/exists', authenticateRequest, async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    const exists = await getManager().databaseExists(name);
    const connectionUrl = exists ? getManager().getConnectionUrl(name) : null;
    
    res.json({ 
      exists,
      branchName: name,
      connectionUrl
    });
  } catch (error) {
    console.error('Failed to check branch existence:', error);
    res.status(500).json({ 
      error: 'Failed to check branch existence',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get branch connection URL
app.get('/api/branches/:name/url', authenticateRequest, async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name is required' });
    }
    
    const exists = await getManager().databaseExists(name);
    if (!exists) {
      return res.status(404).json({ error: `Branch '${name}' not found` });
    }
    
    const connectionUrl = getManager().getConnectionUrl(name);
    
    res.json({ 
      branchName: name,
      connectionUrl
    });
  } catch (error) {
    console.error('Failed to get branch URL:', error);
    res.status(500).json({ 
      error: 'Failed to get branch connection URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanup old branches
app.post('/api/branches/cleanup', authenticateRequest, async (req, res) => {
  try {
    const { dryRun = false, exclude = [] } = req.body;
    
    const branches = await getManager().listBranches();
    
    // Simple cleanup logic: branches with 0 connections
    const toDelete = branches.filter(branch => 
      branch.connections === 0 && 
      !exclude.includes(branch.name) &&
      !branch.name.includes('production') &&
      !branch.name.includes('staging')
    );

    if (dryRun) {
      return res.json({
        dryRun: true,
        branchesToDelete: toDelete,
        count: toDelete.length,
        message: `${toDelete.length} branches would be deleted`
      });
    }

    const results = [];
    for (const branch of toDelete) {
      try {
        await getManager().deleteBranch(branch.name);
        results.push({ branch: branch.name, status: 'deleted' });
      } catch (error) {
        results.push({ 
          branch: branch.name, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      results,
      deleted: results.filter(r => r.status === 'deleted').length,
      failed: results.filter(r => r.status === 'failed').length,
      message: `Cleanup completed: ${results.filter(r => r.status === 'deleted').length} deleted, ${results.filter(r => r.status === 'failed').length} failed`
    });
  } catch (error) {
    console.error('Failed to cleanup branches:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup branches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (manager) {
    await manager.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  if (manager) {
    await manager.close();
  }
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Postgres Branch Manager API server running on port ${port}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Authentication: ${isDevelopment() ? 'disabled (dev mode)' : 'enabled'}`);
});

export default app;