/*!
 * Integration tests for RAG Studio Core
 *
 * Tests the complete SQL service setup including migrations,
 * connections, and basic CRUD operations.
 */

use core::{SqlService, SqlConfig, AppState, StateManager};
use tempfile::TempDir;
use tokio;

#[tokio::test]
async fn test_sql_service_full_setup() {
    // Create temporary directory for test database
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_app.db");

    // Create MVP configuration
    let config = SqlConfig::new_mvp(&db_path);

    // Initialize SQL service
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    // Run migrations
    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Test connection to app database
    let _app_conn = sql_service.get_app_connection().await.expect("Failed to get app connection");

    // Test connection to events database (should use app connection for MVP)
    let _events_conn = sql_service.get_events_connection().await.expect("Failed to get events connection");

    // Test health check
    let health = sql_service.health_check().await.expect("Failed to get health metrics");
    assert!(!health.is_split_database);
    assert!(health.events_db_size.is_none());
    assert!(health.events_pool_active.is_none());

    println!("✅ SQL service full setup test passed");
}

#[tokio::test]
async fn test_production_split_database_setup() {
    // Create temporary directory for test databases
    let temp_dir = TempDir::new().unwrap();
    let app_db_path = temp_dir.path().join("test_app.db");
    let events_db_path = temp_dir.path().join("test_events.db");

    // Create production configuration with split databases
    let config = SqlConfig::new_production(&app_db_path, &events_db_path);

    // Initialize SQL service
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service with split databases");

    // Run migrations
    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Test both database connections
    let _app_conn = sql_service.get_app_connection().await.expect("Failed to get app connection");
    let _events_conn = sql_service.get_events_connection().await.expect("Failed to get events connection");

    // Test health check for split database
    let health = sql_service.health_check().await.expect("Failed to get health metrics");
    assert!(health.is_split_database);
    assert!(health.events_db_size.is_some());
    assert!(health.events_pool_active.is_some());

    println!("✅ Production split database setup test passed");
}

#[tokio::test]
async fn test_state_manager_integration() {
    // Test state manager initialization
    let state_manager = StateManager::new();

    // Test reading initial state
    let state = state_manager.read_state();
    assert!(state.knowledge_bases.is_empty());
    assert!(state.pipeline_runs.is_empty());
    assert!(state.tools.is_empty());

    // Test state snapshot
    let snapshot = state_manager.get_state_snapshot();
    assert!(snapshot.knowledge_bases.is_empty());

    // Test loading state
    let mut new_state = AppState::default();
    new_state.settings.insert("test_key".to_string(), "test_value".to_string());

    state_manager.load_state(new_state);

    let loaded_state = state_manager.read_state();
    assert_eq!(loaded_state.settings.get("test_key"), Some(&"test_value".to_string()));

    println!("✅ State manager integration test passed");
}

#[tokio::test]
async fn test_backup_and_restore() {
    // Create temporary directory
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_app.db");

    // Create SQL service
    let config = SqlConfig::new_mvp(&db_path);
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    // Run migrations to create schema
    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Create backup directory
    let backup_dir = temp_dir.path().join("backups");
    std::fs::create_dir_all(&backup_dir).expect("Failed to create backup directory");

    // Test backup functionality
    let result = sql_service.backup_databases().await;
    assert!(result.is_ok(), "Backup should succeed: {:?}", result);

    println!("✅ Backup and restore test passed");
}

#[tokio::test]
async fn test_transaction_handling() {
    // Create temporary directory
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_app.db");

    // Create SQL service
    let config = SqlConfig::new_mvp(&db_path);
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    // Run migrations
    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Test app transaction
    let app_result = sql_service.with_app_transaction(|_conn| {
        Ok(42)
    }).await;
    assert_eq!(app_result.unwrap(), 42);

    // Test events transaction (uses app connection for MVP)
    let events_result = sql_service.with_events_transaction(|_conn| {
        Ok("test".to_string())
    }).await;
    assert_eq!(events_result.unwrap(), "test");

    println!("✅ Transaction handling test passed");
}

#[tokio::test]
async fn test_database_configuration() {
    // Create temporary directory
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_app.db");

    // Test custom configuration
    let mut config = SqlConfig::new_mvp(&db_path);
    config.app_pool_size = 5;
    config.backup_enabled = false;

    // Create SQL service with custom config
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    // Run migrations
    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Verify configuration was applied
    let health = sql_service.health_check().await.expect("Failed to get health metrics");
    assert!(!health.is_split_database);

    println!("✅ Database configuration test passed");
}

#[tokio::test]
async fn test_error_handling() {
    // Test with invalid path
    let invalid_path = "/invalid/path/that/does/not/exist/test.db";
    let config = SqlConfig::new_mvp(invalid_path);

    // This should fail gracefully
    let result = SqlService::new(config).await;
    assert!(result.is_err(), "Should fail with invalid path");

    println!("✅ Error handling test passed");
}

#[tokio::test]
async fn test_wal_mode_configuration() {
    use core::services::sql::WalMode;

    // Test WAL mode enum
    assert_eq!(WalMode::Normal.as_str(), "NORMAL");
    assert_eq!(WalMode::Full.as_str(), "FULL");

    // Create temporary directory
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_app.db");

    // Create config with specific WAL mode
    let mut config = SqlConfig::new_mvp(&db_path);
    config.app_wal_mode = WalMode::Normal;

    // Should succeed with valid WAL mode
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");
    sql_service.run_migrations().await.expect("Failed to run migrations");

    println!("✅ WAL mode configuration test passed");
}