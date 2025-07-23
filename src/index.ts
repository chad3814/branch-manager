import { Pool, PoolClient } from 'pg';

export interface BranchConfig {
  name: string;
  sourceDatabase: string;
}

export interface BranchInfo {
  name: string;
  createdAt: Date;
  size: string;
  connections: number;
}

export interface BranchManagerOptions {
  connectionUrl: string;
  defaultPrefix?: string;
  maxConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
}

export class DatabaseBranchManager {
  private pool: Pool;
  private baseUrl: string;
  private defaultPrefix: string;

  constructor(options: BranchManagerOptions | string) {
    if (typeof options === 'string') {
      // Backward compatibility
      this.baseUrl = options;
      this.defaultPrefix = 'db_';
      this.pool = new Pool({ 
        connectionString: options,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      this.baseUrl = options.connectionUrl;
      this.defaultPrefix = options.defaultPrefix || 'db_';
      this.pool = new Pool({ 
        connectionString: options.connectionUrl,
        max: options.maxConnections || 10,
        idleTimeoutMillis: options.idleTimeout || 30000,
        connectionTimeoutMillis: options.connectionTimeout || 2000,
      });
    }
  }

  /**
   * Create a new database branch using PostgreSQL template
   */
  async createBranch(config: BranchConfig): Promise<string> {
    const client = await this.pool.connect();
    const branchName = this.sanitizeDatabaseName(config.name);
    
    try {
      console.log(`Creating database branch: ${branchName} from ${config.sourceDatabase}`);
      
      // Check if source database exists
      const sourceExists = await this._databaseExists(client, config.sourceDatabase);
      if (!sourceExists) {
        throw new Error(`Source database ${config.sourceDatabase} not found`);
      }

      // Check if branch already exists
      const branchExists = await this._databaseExists(client, branchName);
      if (branchExists) {
        console.log(`Branch ${branchName} already exists, returning existing connection`);
        return this.getBranchConnectionUrl(branchName);
      }

      // Terminate active connections to source database
      await this.terminateConnections(client, config.sourceDatabase);
      
      // Wait a moment for connections to close
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create the branch database using template
      await client.query(`CREATE DATABASE "${branchName}" WITH TEMPLATE "${config.sourceDatabase}"`);
      
      console.log(`✅ Successfully created database branch: ${branchName}`);
      
      return this.getBranchConnectionUrl(branchName);
    } catch (error) {
      console.error(`Failed to create branch ${branchName}:`, error);
      throw new Error(`Failed to create database branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete a database branch
   */
  async deleteBranch(branchName: string): Promise<void> {
    const client = await this.pool.connect();
    const sanitizedName = this.sanitizeDatabaseName(branchName);
    
    try {
      console.log(`Deleting database branch: ${sanitizedName}`);
      
      // Check if branch exists
      const branchExists = await this._databaseExists(client, sanitizedName);
      if (!branchExists) {
        console.log(`Branch ${sanitizedName} doesn't exist, skipping deletion`);
        return;
      }

      // Terminate connections to branch database
      await this.terminateConnections(client, sanitizedName);
      
      // Wait a moment for connections to close
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Drop the database
      await client.query(`DROP DATABASE "${sanitizedName}"`);
      
      console.log(`✅ Successfully deleted database branch: ${sanitizedName}`);
    } catch (error) {
      console.error(`Failed to delete branch ${sanitizedName}:`, error);
      throw new Error(`Failed to delete database branch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  /**
   * List all database branches
   */
  async listBranches(pattern?: string): Promise<BranchInfo[]> {
    const client = await this.pool.connect();
    const searchPattern = pattern || `${this.defaultPrefix}%`;
    
    try {
      const result = await client.query(`
        SELECT 
          d.datname as name,
          pg_database_size(d.datname) as size,
          COALESCE(s.connections, 0) as connections
        FROM pg_database d
        LEFT JOIN (
          SELECT datname, COUNT(*) as connections
          FROM pg_stat_activity
          WHERE datname IS NOT NULL
          GROUP BY datname
        ) s ON d.datname = s.datname
        WHERE d.datname LIKE $1
        AND d.datname NOT IN ('postgres', 'template0', 'template1')
        ORDER BY d.datname
      `, [searchPattern]);
      
      return result.rows.map(row => ({
        name: row.name,
        createdAt: new Date(), // PostgreSQL doesn't track creation time by default
        size: this.formatBytes(parseInt(row.size)),
        connections: parseInt(row.connections)
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Check if a database exists
   */
  async databaseExists(dbName: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      return await this._databaseExists(client, dbName);
    } finally {
      client.release();
    }
  }

  /**
   * Get connection URL for a specific database
   */
  getConnectionUrl(dbName: string): string {
    return this.getBranchConnectionUrl(dbName);
  }

  /**
   * Check if a database exists (internal)
   */
  private async _databaseExists(client: PoolClient, dbName: string): Promise<boolean> {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    return result.rows.length > 0;
  }

  /**
   * Terminate all connections to a database
   */
  private async terminateConnections(client: PoolClient, dbName: string): Promise<void> {
    try {
      await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = $1 
        AND pid <> pg_backend_pid()
      `, [dbName]);
    } catch (error) {
      // It's okay if this fails - might mean no connections to terminate
      console.log(`Note: Could not terminate connections for ${dbName}:`, error);
    }
  }

  /**
   * Sanitize database name to prevent SQL injection
   */
  private sanitizeDatabaseName(name: string): string {
    // Remove special characters and ensure it starts with the prefix
    const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    return sanitized.startsWith(this.defaultPrefix) ? sanitized : `${this.defaultPrefix}${sanitized}`;
  }

  /**
   * Generate connection URL for a branch
   */
  private getBranchConnectionUrl(branchName: string): string {
    return this.baseUrl.replace(/\/[^\/]*(\?.*)?$/, `/${branchName}$1`);
  }

  /**
   * Format bytes to human readable size
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export for backward compatibility
export { DatabaseBranchManager as PostgresBranchManager };