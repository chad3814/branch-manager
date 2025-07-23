#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { DatabaseBranchManager } from './index';

// Load environment variables
config();

const program = new Command();

program
  .name('pg-branch')
  .description('PostgreSQL database branching tool with copy-on-write functionality')
  .version('1.0.0');

// Global options
program
  .option('-u, --url <url>', 'PostgreSQL connection URL', process.env.DATABASE_URL)
  .option('--prefix <prefix>', 'Database name prefix', process.env.DB_PREFIX || 'db_')
  .option('--verbose', 'Enable verbose output', false);

// Create branch command
program
  .command('create')
  .description('Create a new database branch')
  .argument('<name>', 'Branch name')
  .option('-s, --source <source>', 'Source database name', process.env.SOURCE_DATABASE || 'production')
  .action(async (name: string, options) => {
    const globalOpts = program.opts();
    
    if (!globalOpts.url) {
      console.error('❌ Database URL is required. Set DATABASE_URL environment variable or use --url option');
      process.exit(1);
    }

    const manager = new DatabaseBranchManager({
      connectionUrl: globalOpts.url,
      defaultPrefix: globalOpts.prefix
    });

    try {
      if (globalOpts.verbose) console.log(`🔧 Creating branch '${name}' from '${options.source}'...`);
      
      const branchUrl = await manager.createBranch({
        name,
        sourceDatabase: options.source
      });
      
      console.log(`✅ Branch created successfully!`);
      console.log(`🔗 Connection URL: ${branchUrl}`);
      
      if (globalOpts.verbose) {
        console.log(`📊 Branch details:`);
        console.log(`   Name: ${name}`);
        console.log(`   Source: ${options.source}`);
        console.log(`   Prefix: ${globalOpts.prefix}`);
      }
    } catch (error) {
      console.error('❌ Failed to create branch:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await manager.close();
    }
  });

// Delete branch command
program
  .command('delete')
  .description('Delete a database branch')
  .argument('<name>', 'Branch name')
  .option('-f, --force', 'Force deletion without confirmation', false)
  .action(async (name: string, options) => {
    const globalOpts = program.opts();
    
    if (!globalOpts.url) {
      console.error('❌ Database URL is required. Set DATABASE_URL environment variable or use --url option');
      process.exit(1);
    }

    const manager = new DatabaseBranchManager({
      connectionUrl: globalOpts.url,
      defaultPrefix: globalOpts.prefix
    });

    try {
      // Confirmation prompt (skip if --force)
      if (!options.force) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(`⚠️  Are you sure you want to delete branch '${name}'? (y/N): `, resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Deletion cancelled');
          return;
        }
      }

      if (globalOpts.verbose) console.log(`🗑️  Deleting branch '${name}'...`);
      
      await manager.deleteBranch(name);
      console.log(`✅ Branch '${name}' deleted successfully!`);
    } catch (error) {
      console.error('❌ Failed to delete branch:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await manager.close();
    }
  });

// List branches command
program
  .command('list')
  .alias('ls')
  .description('List all database branches')
  .option('-p, --pattern <pattern>', 'Filter pattern for branch names')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const globalOpts = program.opts();
    
    if (!globalOpts.url) {
      console.error('❌ Database URL is required. Set DATABASE_URL environment variable or use --url option');
      process.exit(1);
    }

    const manager = new DatabaseBranchManager({
      connectionUrl: globalOpts.url,
      defaultPrefix: globalOpts.prefix
    });

    try {
      if (globalOpts.verbose) console.log('📋 Listing database branches...');
      
      const branches = await manager.listBranches(options.pattern);
      
      if (options.json) {
        console.log(JSON.stringify(branches, null, 2));
      } else {
        if (branches.length === 0) {
          console.log('No branches found');
        } else {
          console.log(`Found ${branches.length} branches:\n`);
          console.log('Name'.padEnd(30) + 'Size'.padEnd(12) + 'Connections');
          console.log('-'.repeat(50));
          
          branches.forEach(branch => {
            console.log(
              branch.name.padEnd(30) + 
              branch.size.padEnd(12) + 
              branch.connections.toString()
            );
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to list branches:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await manager.close();
    }
  });

// Check command (verify branch exists)
program
  .command('exists')
  .description('Check if a database branch exists')
  .argument('<name>', 'Branch name')
  .action(async (name: string) => {
    const globalOpts = program.opts();
    
    if (!globalOpts.url) {
      console.error('❌ Database URL is required. Set DATABASE_URL environment variable or use --url option');
      process.exit(1);
    }

    const manager = new DatabaseBranchManager({
      connectionUrl: globalOpts.url,
      defaultPrefix: globalOpts.prefix
    });

    try {
      const exists = await manager.databaseExists(name);
      
      if (exists) {
        console.log(`✅ Branch '${name}' exists`);
        const url = manager.getConnectionUrl(name);
        if (globalOpts.verbose) console.log(`🔗 Connection URL: ${url}`);
        process.exit(0);
      } else {
        console.log(`❌ Branch '${name}' does not exist`);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to check branch:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await manager.close();
    }
  });

// Cleanup command
program
  .command('cleanup')
  .description('Clean up old/unused database branches')
  .option('--dry-run', 'Show what would be deleted without actually deleting', false)
  .option('--max-age <days>', 'Maximum age in days (default: 7)', '7')
  .option('--exclude <names...>', 'Database names to exclude from cleanup')
  .action(async (options) => {
    const globalOpts = program.opts();
    
    if (!globalOpts.url) {
      console.error('❌ Database URL is required. Set DATABASE_URL environment variable or use --url option');
      process.exit(1);
    }

    const manager = new DatabaseBranchManager({
      connectionUrl: globalOpts.url,
      defaultPrefix: globalOpts.prefix
    });

    try {
      console.log('🔍 Scanning for branches to cleanup...');
      
      const branches = await manager.listBranches();
      const excludeList = options.exclude || [];
      
      // Simple cleanup logic: branches with 0 connections that are not in exclude list
      const toDelete = branches.filter(branch => 
        branch.connections === 0 && 
        !excludeList.includes(branch.name) &&
        !branch.name.includes('production') &&
        !branch.name.includes('staging')
      );

      if (toDelete.length === 0) {
        console.log('✅ No branches found for cleanup');
        return;
      }

      console.log(`📋 Found ${toDelete.length} branches for cleanup:`);
      toDelete.forEach(branch => {
        console.log(`  • ${branch.name} (${branch.size}, ${branch.connections} connections)`);
      });

      if (options.dryRun) {
        console.log('\n🔍 DRY RUN: These branches would be deleted');
        return;
      }

      console.log('\n🗑️  Starting cleanup...');
      
      for (const branch of toDelete) {
        try {
          await manager.deleteBranch(branch.name);
          console.log(`  ✅ Deleted ${branch.name}`);
        } catch (error) {
          console.error(`  ❌ Failed to delete ${branch.name}:`, error instanceof Error ? error.message : error);
        }
      }

      console.log(`\n✅ Cleanup completed! Processed ${toDelete.length} branches`);
    } catch (error) {
      console.error('❌ Cleanup failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await manager.close();
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}