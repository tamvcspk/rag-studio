/*!
 * SQL Service Integration Tests
 *
 * Tests complete SQL service setup including migrations,
 * connections, and database operations in realistic scenarios.
 */

use rag_core::{SqlService, SqlConfig};
use tempfile::TempDir;

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
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    // Run migrations
    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Test health check for production setup
    let health = sql_service.health_check().await.expect("Failed to get health metrics");
    assert!(health.is_split_database);
    assert!(health.events_db_size.is_some());
    assert!(health.events_pool_active.is_some());
}

#[tokio::test]
async fn test_sql_transactions_integration() {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_transactions.db");

    let config = SqlConfig::new_mvp(&db_path);
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Test app transaction
    let app_result = sql_service.with_app_transaction(|_conn| {
        // Simulate database operation
        Ok("app_transaction_success".to_string())
    }).await;
    assert!(app_result.is_ok());
    assert_eq!(app_result.unwrap(), "app_transaction_success");

    // Test events transaction
    let events_result = sql_service.with_events_transaction(|_conn| {
        // Simulate database operation
        Ok(42)
    }).await;
    assert!(events_result.is_ok());
    assert_eq!(events_result.unwrap(), 42);
}

#[tokio::test]
async fn test_backup_functionality_integration() {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test_backup.db");

    let config = SqlConfig::new_mvp(&db_path);
    let sql_service = SqlService::new(config).await.expect("Failed to create SQL service");

    sql_service.run_migrations().await.expect("Failed to run migrations");

    // Clean up any existing backup directory to avoid conflicts
    if std::path::Path::new("backups").exists() {
        std::fs::remove_dir_all("backups").ok();
    }

    // Test backup functionality
    let backup_result = sql_service.backup_databases().await;
    assert!(backup_result.is_ok(), "Backup should succeed: {:?}", backup_result);

    // Clean up after test
    if std::path::Path::new("backups").exists() {
        std::fs::remove_dir_all("backups").ok();
    }
}