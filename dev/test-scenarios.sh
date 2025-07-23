#!/bin/bash

# Branch Manager Development Test Scenarios
# This script demonstrates various branch-manager operations for development testing

set -e

echo "🧪 Branch Manager Development Test Scenarios"
echo "=============================================="

# Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/branch_manager_dev"
CLI_CMD="npm run dev:cli --"

echo ""
echo "📋 Available Test Scenarios:"
echo "1. Basic branch creation and deletion"
echo "2. Branch from different source databases"
echo "3. List and inspect branches"
echo "4. Error handling scenarios"
echo "5. Performance testing with large databases"
echo ""

read -p "Enter scenario number (1-5) or 'all' to run all scenarios: " scenario

run_scenario_1() {
    echo ""
    echo "🔬 Scenario 1: Basic Branch Operations"
    echo "======================================"
    
    echo "Creating a feature branch from sample_app_production..."
    $CLI_CMD create feature_user_auth --source sample_app_production --url "$DATABASE_URL" --verbose
    
    echo ""
    echo "Creating a hotfix branch..."
    $CLI_CMD create hotfix_email_bug --source sample_app_production --url "$DATABASE_URL" --verbose
    
    echo ""
    echo "Listing all branches..."
    $CLI_CMD list --url "$DATABASE_URL"
    
    echo ""
    echo "Checking if branches exist..."
    $CLI_CMD exists feature_user_auth --url "$DATABASE_URL" --verbose
    $CLI_CMD exists hotfix_email_bug --url "$DATABASE_URL" --verbose
    
    echo ""
    echo "Cleaning up branches..."
    $CLI_CMD delete feature_user_auth --url "$DATABASE_URL" --force --verbose
    $CLI_CMD delete hotfix_email_bug --url "$DATABASE_URL" --force --verbose
    
    echo "✅ Scenario 1 completed!"
}

run_scenario_2() {
    echo ""
    echo "🔬 Scenario 2: Multiple Source Databases"  
    echo "========================================"
    
    echo "Creating branch from production database..."
    $CLI_CMD create test_from_prod --source sample_app_production --url "$DATABASE_URL" --verbose
    
    echo ""
    echo "Creating branch from staging database..."
    $CLI_CMD create test_from_staging --source sample_app_staging --url "$DATABASE_URL" --verbose
    
    echo ""
    echo "Comparing branch sizes..."
    $CLI_CMD list --url "$DATABASE_URL" --pattern "dev_test_*"
    
    echo ""
    echo "Cleaning up..."
    $CLI_CMD delete test_from_prod --url "$DATABASE_URL" --force
    $CLI_CMD delete test_from_staging --url "$DATABASE_URL" --force
    
    echo "✅ Scenario 2 completed!"
}

run_scenario_3() {
    echo ""
    echo "🔬 Scenario 3: Branch Inspection and Management"
    echo "=============================================="
    
    # Create several branches for testing
    $CLI_CMD create pr_123 --source sample_app_production --url "$DATABASE_URL"
    $CLI_CMD create pr_124 --source sample_app_production --url "$DATABASE_URL"  
    $CLI_CMD create feature_dashboard --source sample_app_production --url "$DATABASE_URL"
    
    echo ""
    echo "Listing all branches with detailed info..."
    $CLI_CMD list --url "$DATABASE_URL"
    
    echo ""
    echo "Listing branches with pattern matching..."
    $CLI_CMD list --pattern "dev_pr_*" --url "$DATABASE_URL"
    
    echo ""
    echo "Testing branch existence checks..."
    $CLI_CMD exists pr_123 --url "$DATABASE_URL"
    $CLI_CMD exists nonexistent_branch --url "$DATABASE_URL" || echo "Expected: Branch doesn't exist"
    
    echo ""
    echo "Running cleanup operations..."
    $CLI_CMD cleanup --dry-run --url "$DATABASE_URL"
    
    echo ""
    echo "Cleaning up test branches..."
    $CLI_CMD delete pr_123 --url "$DATABASE_URL" --force
    $CLI_CMD delete pr_124 --url "$DATABASE_URL" --force
    $CLI_CMD delete feature_dashboard --url "$DATABASE_URL" --force
    
    echo "✅ Scenario 3 completed!"
}

run_scenario_4() {
    echo ""
    echo "🔬 Scenario 4: Error Handling"
    echo "============================="
    
    echo "Testing invalid source database..."
    $CLI_CMD create test_invalid --source nonexistent_db --url "$DATABASE_URL" || echo "✅ Expected error handled"
    
    echo ""
    echo "Testing duplicate branch creation..."
    $CLI_CMD create duplicate_test --source sample_app_production --url "$DATABASE_URL"
    $CLI_CMD create duplicate_test --source sample_app_production --url "$DATABASE_URL" || echo "✅ Duplicate creation handled"
    
    echo ""
    echo "Testing deletion of non-existent branch..."
    $CLI_CMD delete nonexistent_branch --url "$DATABASE_URL" --force || echo "✅ Non-existent deletion handled"
    
    echo ""
    echo "Cleaning up..."
    $CLI_CMD delete duplicate_test --url "$DATABASE_URL" --force
    
    echo "✅ Scenario 4 completed!"
}

run_scenario_5() {
    echo ""
    echo "🔬 Scenario 5: Performance Testing"
    echo "=================================="
    
    echo "Creating multiple branches rapidly..."
    for i in {1..5}; do
        echo "Creating performance_test_$i..."
        $CLI_CMD create "performance_test_$i" --source sample_app_production --url "$DATABASE_URL"
    done
    
    echo ""
    echo "Measuring list operation performance..."
    time $CLI_CMD list --url "$DATABASE_URL"
    
    echo ""
    echo "Batch cleanup test..."
    time $CLI_CMD cleanup --url "$DATABASE_URL" --exclude sample_app_production,sample_app_staging
    
    echo "✅ Scenario 5 completed!"
}

# Run scenarios based on user input
case $scenario in
    "1")
        run_scenario_1
        ;;
    "2") 
        run_scenario_2
        ;;
    "3")
        run_scenario_3
        ;;
    "4")
        run_scenario_4
        ;;
    "5")
        run_scenario_5
        ;;
    "all")
        run_scenario_1
        run_scenario_2  
        run_scenario_3
        run_scenario_4
        run_scenario_5
        ;;
    *)
        echo "❌ Invalid scenario number. Please choose 1-5 or 'all'"
        exit 1
        ;;
esac

echo ""
echo "🎉 Test scenarios completed!"
echo "💡 Check the database with Adminer at http://localhost:8080"
echo "   Server: postgres, Username: postgres, Password: postgres, Database: branch_manager_dev"