-- Initialize development databases
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases for testing different scenarios
CREATE DATABASE branch_manager_production_copy;
CREATE DATABASE branch_manager_staging_copy;

-- Create some sample databases to test branching
CREATE DATABASE sample_app_production;
CREATE DATABASE sample_app_staging;

-- Add some sample data to the production copy for testing
\c sample_app_production;

-- Sample tables
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data
INSERT INTO users (name, email) VALUES 
    ('John Doe', 'john@example.com'),
    ('Jane Smith', 'jane@example.com'),
    ('Bob Johnson', 'bob@example.com');

INSERT INTO posts (user_id, title, content) VALUES 
    (1, 'First Post', 'This is my first post content'),
    (1, 'Second Post', 'This is my second post content'),
    (2, 'Jane''s Post', 'Hello from Jane!'),
    (3, 'Bob''s Thoughts', 'Some thoughts from Bob');

-- Switch back to default database
\c branch_manager_dev;

-- Create a sample tracking table for branch metadata (optional)
CREATE TABLE IF NOT EXISTS branch_metadata (
    id SERIAL PRIMARY KEY,
    branch_name VARCHAR(100) UNIQUE NOT NULL,
    source_database VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    purpose TEXT
);

-- Add some sample branch metadata
INSERT INTO branch_metadata (branch_name, source_database, created_by, purpose) VALUES 
    ('feature_user_profiles', 'sample_app_production', 'developer', 'Testing user profile feature'),
    ('hotfix_email_validation', 'sample_app_production', 'developer', 'Fix email validation bug');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;