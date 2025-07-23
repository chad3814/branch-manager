-- Test data for branch-manager development
-- Run this to populate test databases with realistic data

\c sample_app_production;

-- Clear existing data
TRUNCATE posts, users RESTART IDENTITY CASCADE;

-- More comprehensive test data
INSERT INTO users (name, email) VALUES 
    ('Alice Johnson', 'alice.johnson@example.com'),
    ('Bob Smith', 'bob.smith@example.com'),
    ('Carol Davis', 'carol.davis@example.com'),
    ('David Wilson', 'david.wilson@example.com'),
    ('Eve Brown', 'eve.brown@example.com'),
    ('Frank Miller', 'frank.miller@example.com'),
    ('Grace Lee', 'grace.lee@example.com'),
    ('Henry Clark', 'henry.clark@example.com'),
    ('Ivy Martinez', 'ivy.martinez@example.com'),
    ('Jack Taylor', 'jack.taylor@example.com');

INSERT INTO posts (user_id, title, content) VALUES 
    (1, 'Getting Started with PostgreSQL', 'PostgreSQL is a powerful, open source object-relational database system...'),
    (1, 'Database Indexing Best Practices', 'Proper indexing is crucial for database performance...'),
    (2, 'Introduction to Docker', 'Docker containers have revolutionized how we deploy applications...'),
    (2, 'Kubernetes for Beginners', 'Kubernetes orchestrates containerized applications at scale...'),
    (3, 'React Hooks Deep Dive', 'React hooks changed how we write functional components...'),
    (3, 'State Management in Modern React', 'Managing state in large React applications...'),
    (4, 'Building REST APIs with Node.js', 'Node.js provides an excellent platform for building APIs...'),
    (4, 'GraphQL vs REST', 'Comparing two popular API paradigms...'),
    (5, 'CSS Grid Layout Guide', 'CSS Grid provides powerful layout capabilities...'),
    (5, 'Responsive Design Principles', 'Creating websites that work on all devices...'),
    (6, 'Python for Data Analysis', 'Using pandas and numpy for data manipulation...'),
    (6, 'Machine Learning Basics', 'An introduction to ML concepts and algorithms...'),
    (7, 'Git Workflow Best Practices', 'Effective strategies for team collaboration with Git...'),
    (7, 'Code Review Guidelines', 'How to conduct effective code reviews...'),
    (8, 'Testing Strategies for Web Apps', 'Unit, integration, and e2e testing approaches...'),
    (8, 'Debugging Techniques', 'Tools and methods for effective debugging...'),
    (9, 'Database Migration Strategies', 'Safe approaches to evolving database schemas...'),
    (9, 'Monitoring and Observability', 'Keeping track of system health and performance...'),
    (10, 'DevOps Culture and Practices', 'Building effective development and operations practices...'),
    (10, 'Infrastructure as Code', 'Managing infrastructure with version control...');

-- Add some additional tables for more complex branching scenarios
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_categories (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, category_id)
);

INSERT INTO categories (name, description) VALUES 
    ('Technology', 'Posts about technology and programming'),
    ('Database', 'Database related content'),
    ('Web Development', 'Frontend and backend web development'),
    ('DevOps', 'Development operations and infrastructure'),
    ('Data Science', 'Data analysis and machine learning');

-- Link posts to categories
INSERT INTO post_categories (post_id, category_id) VALUES 
    (1, 2), (2, 2),  -- Database posts
    (3, 4), (4, 4),  -- DevOps posts
    (5, 3), (6, 3),  -- Web dev posts
    (7, 3), (8, 3),  -- More web dev
    (9, 3), (10, 3), -- CSS posts
    (11, 5), (12, 5), -- Data science
    (13, 4), (14, 4), -- Git/DevOps
    (15, 3), (16, 1), -- Testing/debugging
    (17, 2), (18, 4), -- Database/monitoring
    (19, 4), (20, 4); -- DevOps

-- Create views for testing
CREATE VIEW user_post_counts AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name, u.email;

CREATE VIEW category_stats AS
SELECT 
    c.name as category,
    COUNT(pc.post_id) as post_count
FROM categories c
LEFT JOIN post_categories pc ON c.id = pc.category_id
GROUP BY c.id, c.name;

-- Switch to staging database and create similar but smaller dataset
\c sample_app_staging;

-- Create same schema
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

-- Smaller dataset for staging
INSERT INTO users (name, email) VALUES 
    ('Test User 1', 'test1@staging.com'),
    ('Test User 2', 'test2@staging.com'),
    ('Test User 3', 'test3@staging.com');

INSERT INTO posts (user_id, title, content) VALUES 
    (1, 'Staging Test Post 1', 'This is a test post in staging environment'),
    (2, 'Staging Test Post 2', 'Another test post for staging'),
    (3, 'Staging Test Post 3', 'Third test post in staging');

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;