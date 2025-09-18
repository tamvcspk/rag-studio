/*!
 * SQL Service Implementation
 *
 * Provides SQLite database access with connection pooling, migrations,
 * backup functionality, and health monitoring. Implements MVP architecture
 * with upgrade path to split database design.
 */

use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::path::{Path, PathBuf};
use std::time::Duration;
use thiserror::Error;
use chrono::{DateTime, Utc};
use tracing::info;

// Embed migrations at compile time
pub const APP_MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations/app_meta/");

/// SQL Service Error Types
#[derive(Debug, Error)]
pub enum SqlError {
    #[error("Database connection failed: {0}")]
    ConnectionFailed(String),

    #[error("Migration failed: {0}")]
    MigrationFailed(String),

    #[error("Query execution failed: {0}")]
    QueryFailed(#[from] diesel::result::Error),

    #[error("Backup operation failed: {0}")]
    BackupFailed(String),

    #[error("Transaction failed: {0}")]
    TransactionFailed(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),
}

/// WAL Mode Configuration
#[derive(Debug, Clone, Copy)]
pub enum WalMode {
    Normal,  // app_meta.db - balance performance/durability
    Full,    // events.db - maximum durability (for production)
}

impl WalMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            WalMode::Normal => "NORMAL",
            WalMode::Full => "FULL",
        }
    }
}

/// SQL Service Configuration
#[derive(Debug, Clone)]
pub struct SqlConfig {
    // app_meta.db settings (MVP: single database)
    pub app_db_path: PathBuf,
    pub app_pool_size: u32,           // Default: 10
    pub app_connection_timeout: Duration, // Default: 30s
    pub app_wal_mode: WalMode,        // NORMAL

    // events.db settings (Production upgrade path)
    pub events_db_path: Option<PathBuf>, // None for MVP, Some for production
    pub events_pool_size: u32,        // Default: 5 (used when events_db enabled)
    pub events_connection_timeout: Duration, // Default: 10s
    pub events_wal_mode: WalMode,     // FULL (for separate events.db)

    // MVP flag
    pub use_split_databases: bool,    // false for MVP, true for production

    // Common settings
    pub busy_timeout: Duration,       // Default: 5s
    pub journal_size_limit: i64,      // Default: 64MB
    pub checkpoint_interval: Duration, // Default: 10s
    pub vacuum_interval: Duration,    // Default: 24h
    pub backup_enabled: bool,         // Default: true
    pub backup_interval: Duration,    // Default: 1h
}

impl SqlConfig {
    /// Create default configuration for MVP (single database)
    pub fn new_mvp(app_db_path: impl Into<PathBuf>) -> Self {
        Self {
            app_db_path: app_db_path.into(),
            app_pool_size: 10,
            app_connection_timeout: Duration::from_secs(30),
            app_wal_mode: WalMode::Normal,
            events_db_path: None,
            events_pool_size: 5,
            events_connection_timeout: Duration::from_secs(10),
            events_wal_mode: WalMode::Full,
            use_split_databases: false,
            busy_timeout: Duration::from_secs(5),
            journal_size_limit: 64 * 1024 * 1024, // 64MB
            checkpoint_interval: Duration::from_secs(10),
            vacuum_interval: Duration::from_secs(24 * 3600), // 24h
            backup_enabled: true,
            backup_interval: Duration::from_secs(3600), // 1h
        }
    }

    /// Create production configuration with split databases
    pub fn new_production(
        app_db_path: impl Into<PathBuf>,
        events_db_path: impl Into<PathBuf>,
    ) -> Self {
        let mut config = Self::new_mvp(app_db_path);
        config.events_db_path = Some(events_db_path.into());
        config.use_split_databases = true;
        config
    }

    /// Create test configuration with temporary paths
    #[cfg(test)]
    pub fn test_config(temp_dir: &Path) -> Self {
        Self::new_mvp(temp_dir.join("test_app.db"))
    }
}

/// Database Health Metrics
#[derive(Debug, Clone)]
pub struct DatabaseHealthMetrics {
    pub app_db_size: u64,
    pub events_db_size: Option<u64>, // None for MVP (single database)
    pub app_pool_active: u32,
    pub events_pool_active: Option<u32>, // None for MVP (single pool)
    pub wal_checkpoint_age: Duration,
    pub vacuum_last_run: DateTime<Utc>,
    pub backup_last_run: DateTime<Utc>,
    pub is_split_database: bool, // MVP vs Production mode
}

/// SQL Service with connection pooling and health monitoring
pub struct SqlService {
    app_pool: Pool<ConnectionManager<SqliteConnection>>,
    events_pool: Option<Pool<ConnectionManager<SqliteConnection>>>, // None for MVP
    config: SqlConfig,
    last_vacuum: DateTime<Utc>,
    last_backup: DateTime<Utc>,
}

impl SqlService {
    /// Initialize the SQL service with configuration
    pub async fn new(config: SqlConfig) -> Result<Self, SqlError> {
        info!("Initializing SQL service with config: {:?}", config);

        // Ensure parent directories exist
        if let Some(parent) = config.app_db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Create app database pool
        let app_manager = ConnectionManager::<SqliteConnection>::new(config.app_db_path.to_string_lossy().to_string());
        let app_pool = Pool::builder()
            .max_size(config.app_pool_size)
            .connection_timeout(config.app_connection_timeout)
            .build(app_manager)
            .map_err(|e| SqlError::ConnectionFailed(e.to_string()))?;

        // MVP: Optional events pool (None for single database)
        let events_pool = if config.use_split_databases {
            if let Some(events_db_path) = &config.events_db_path {
                info!("Setting up events database at: {:?}", events_db_path);

                if let Some(parent) = events_db_path.parent() {
                    std::fs::create_dir_all(parent)?;
                }

                let events_manager = ConnectionManager::<SqliteConnection>::new(events_db_path.to_string_lossy().to_string());
                let pool = Pool::builder()
                    .max_size(config.events_pool_size)
                    .connection_timeout(config.events_connection_timeout)
                    .build(events_manager)
                    .map_err(|e| SqlError::ConnectionFailed(e.to_string()))?;
                Some(pool)
            } else {
                return Err(SqlError::ConfigurationError(
                    "events_db_path required when use_split_databases is true".to_string()
                ));
            }
        } else {
            None
        };

        let service = Self {
            app_pool,
            events_pool,
            config,
            last_vacuum: Utc::now(),
            last_backup: Utc::now(),
        };

        // Configure database settings
        service.configure_database().await?;

        Ok(service)
    }

    /// Get connection to app database
    pub async fn get_app_connection(&self) -> Result<PooledConnection<ConnectionManager<SqliteConnection>>, SqlError> {
        self.app_pool.get().map_err(|e| SqlError::ConnectionFailed(e.to_string()))
    }

    /// Get connection to events database (uses app connection for MVP)
    pub async fn get_events_connection(&self) -> Result<PooledConnection<ConnectionManager<SqliteConnection>>, SqlError> {
        match &self.events_pool {
            Some(pool) => pool.get().map_err(|e| SqlError::ConnectionFailed(e.to_string())),
            None => self.app_pool.get().map_err(|e| SqlError::ConnectionFailed(e.to_string())), // MVP: Use app_pool for events
        }
    }

    /// Configure database settings (WAL mode, performance optimizations)
    async fn configure_database(&self) -> Result<(), SqlError> {
        info!("Configuring database settings");

        // Configure app database
        let mut app_conn = self.get_app_connection().await?;
        self.apply_database_config(&mut app_conn, self.config.app_wal_mode)?;

        // Configure events database if split
        if let Some(_) = &self.events_pool {
            let mut events_conn = self.get_events_connection().await?;
            self.apply_database_config(&mut events_conn, self.config.events_wal_mode)?;
        }

        Ok(())
    }

    /// Apply database configuration to a connection
    fn apply_database_config(
        &self,
        conn: &mut SqliteConnection,
        wal_mode: WalMode,
    ) -> Result<(), SqlError> {
        // Set WAL mode
        diesel::sql_query("PRAGMA journal_mode = WAL")
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        // Set synchronous mode based on WAL mode
        let sync_mode = format!("PRAGMA synchronous = {}", wal_mode.as_str());
        diesel::sql_query(&sync_mode)
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        // Performance settings
        diesel::sql_query("PRAGMA cache_size = -64000") // 64MB cache
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        diesel::sql_query("PRAGMA temp_store = MEMORY")
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        diesel::sql_query("PRAGMA mmap_size = 134217728") // 128MB mmap
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        let busy_timeout = format!("PRAGMA busy_timeout = {}", self.config.busy_timeout.as_millis());
        diesel::sql_query(&busy_timeout)
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        diesel::sql_query("PRAGMA wal_autocheckpoint = 1000")
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        // Concurrency and safety settings
        diesel::sql_query("PRAGMA read_uncommitted = false")
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        diesel::sql_query("PRAGMA foreign_keys = true")
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        diesel::sql_query("PRAGMA recursive_triggers = false")
            .execute(conn)
            .map_err(SqlError::QueryFailed)?;

        Ok(())
    }

    /// Run database migrations
    pub async fn run_migrations(&self) -> Result<(), SqlError> {
        info!("Running database migrations");

        // Always run app_meta.db migrations
        let mut app_conn = self.get_app_connection().await?;
        app_conn.run_pending_migrations(APP_MIGRATIONS)
            .map_err(|e| SqlError::MigrationFailed(e.to_string()))?;

        // Production: Run events.db migrations if split database is enabled
        if self.config.use_split_databases {
            info!("Running events database migrations");
            let mut events_conn = self.get_events_connection().await?;
            events_conn.run_pending_migrations(APP_MIGRATIONS)
                .map_err(|e| SqlError::MigrationFailed(e.to_string()))?;
        }
        // MVP: Event sourcing tables are included in APP_MIGRATIONS

        info!("Database migrations completed successfully");
        Ok(())
    }

    /// Backup databases using VACUUM INTO
    pub async fn backup_databases(&self) -> Result<(), SqlError> {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");

        // Always backup app_meta.db
        let app_backup_path = format!("backups/app_meta_{}.db", timestamp);
        info!("Backing up app database to: {}", app_backup_path);
        self.backup_database(&self.config.app_db_path, &app_backup_path).await?;

        // Production: Backup events.db if split database is enabled
        if self.config.use_split_databases {
            if let Some(events_db_path) = &self.config.events_db_path {
                let events_backup_path = format!("backups/events_{}.db", timestamp);
                info!("Backing up events database to: {}", events_backup_path);
                self.backup_database(events_db_path, &events_backup_path).await?;
            }
        }
        // MVP: All data backed up with app_meta.db

        info!("Database backup completed successfully");
        Ok(())
    }

    /// Backup a specific database using VACUUM INTO
    async fn backup_database(&self, source: &Path, dest: &str) -> Result<(), SqlError> {
        // Ensure backup directory exists
        if let Some(parent) = Path::new(dest).parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Use VACUUM INTO for consistent backup
        let backup_query = format!("VACUUM INTO '{}'", dest);
        let mut conn = SqliteConnection::establish(source.to_str().unwrap())
            .map_err(|e| SqlError::BackupFailed(e.to_string()))?;

        diesel::sql_query(&backup_query)
            .execute(&mut conn)
            .map_err(|e| SqlError::BackupFailed(e.to_string()))?;

        Ok(())
    }

    /// Get health metrics for monitoring
    pub async fn health_check(&self) -> Result<DatabaseHealthMetrics, SqlError> {
        let app_db_size = std::fs::metadata(&self.config.app_db_path)
            .map(|m| m.len())
            .unwrap_or(0);

        let events_db_size = if let Some(events_path) = &self.config.events_db_path {
            std::fs::metadata(events_path)
                .map(|m| Some(m.len()))
                .unwrap_or(Some(0))
        } else {
            None
        };

        Ok(DatabaseHealthMetrics {
            app_db_size,
            events_db_size,
            app_pool_active: self.app_pool.state().connections,
            events_pool_active: self.events_pool.as_ref().map(|p| p.state().connections),
            wal_checkpoint_age: Duration::from_secs(0), // TODO: Calculate actual age
            vacuum_last_run: self.last_vacuum,
            backup_last_run: self.last_backup,
            is_split_database: self.config.use_split_databases,
        })
    }

    /// Execute a transaction on the app database
    pub async fn with_app_transaction<T, F>(&self, f: F) -> Result<T, SqlError>
    where
        F: FnOnce(&mut SqliteConnection) -> Result<T, SqlError>,
    {
        let mut conn = self.get_app_connection().await?;
        conn.transaction(|conn| f(conn))
            .map_err(|e| SqlError::TransactionFailed(e.to_string()))
    }

    /// Execute a transaction on the events database
    pub async fn with_events_transaction<T, F>(&self, f: F) -> Result<T, SqlError>
    where
        F: FnOnce(&mut SqliteConnection) -> Result<T, SqlError>,
    {
        let mut conn = self.get_events_connection().await?;
        conn.transaction(|conn| f(conn))
            .map_err(|e| SqlError::TransactionFailed(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_sql_service_initialization() {
        let temp_dir = TempDir::new().unwrap();
        let config = SqlConfig::test_config(temp_dir.path());

        let sql_service = SqlService::new(config).await.unwrap();

        // Test that we can get connections
        let _conn = sql_service.get_app_connection().await.unwrap();
        let _events_conn = sql_service.get_events_connection().await.unwrap();
    }

    #[tokio::test]
    async fn test_health_check() {
        let temp_dir = TempDir::new().unwrap();
        let config = SqlConfig::test_config(temp_dir.path());

        let sql_service = SqlService::new(config).await.unwrap();
        let health = sql_service.health_check().await.unwrap();

        assert!(!health.is_split_database);
        assert!(health.events_db_size.is_none());
        assert!(health.events_pool_active.is_none());
    }

    #[tokio::test]
    async fn test_backup_functionality() {
        let temp_dir = TempDir::new().unwrap();
        let config = SqlConfig::test_config(temp_dir.path());

        let sql_service = SqlService::new(config).await.unwrap();

        // Create backup directory in temp dir
        let backup_dir = temp_dir.path().join("backups");
        std::fs::create_dir_all(&backup_dir).unwrap();

        // This should not fail even with empty database
        let result = sql_service.backup_databases().await;
        assert!(result.is_ok());
    }
}