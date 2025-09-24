use serde::{Deserialize, Serialize};
use tauri::State;
use crate::manager::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerSettings {
    pub mcp_server_enabled: bool,
    pub mcp_server_port: u16,
    pub mcp_server_status: String,
    pub max_connections: u32,
    pub request_timeout: u32,
    pub health_check_interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KbSettings {
    pub default_embedding_model: String,
    pub chunk_size: u32,
    pub chunk_overlap: u32,
    pub search_top_k: u32,
    pub search_threshold: f32,
    pub enable_hybrid_search: bool,
    pub enable_reranking: bool,
    pub citation_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemSettings {
    pub storage_quota_gb: u32,
    pub cache_size_mb: u32,
    pub cache_ttl_seconds: u32,
    pub log_level: String,
    pub log_retention_days: u32,
    pub auto_backup: bool,
    pub backup_interval_hours: u32,
    pub max_backups: u32,
    pub data_directory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    pub air_gapped_mode: bool,
    pub network_policy: String,
    pub encrypt_data: bool,
    pub log_redaction: bool,
    pub citation_policy: bool,
    pub permission_level: String,
    pub audit_logging: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub server: ServerSettings,
    pub kb: KbSettings,
    pub system: SystemSettings,
    pub security: SecuritySettings,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            server: ServerSettings {
                mcp_server_enabled: true,
                mcp_server_port: 3000,
                mcp_server_status: "stopped".to_string(),
                max_connections: 100,
                request_timeout: 30,
                health_check_interval: 30,
            },
            kb: KbSettings {
                default_embedding_model: "sentence-transformers/all-MiniLM-L6-v2".to_string(),
                chunk_size: 512,
                chunk_overlap: 50,
                search_top_k: 10,
                search_threshold: 0.7,
                enable_hybrid_search: true,
                enable_reranking: true,
                citation_mode: "mandatory".to_string(),
            },
            system: SystemSettings {
                storage_quota_gb: 5,
                cache_size_mb: 256,
                cache_ttl_seconds: 3600,
                log_level: "info".to_string(),
                log_retention_days: 30,
                auto_backup: false,
                backup_interval_hours: 24,
                max_backups: 7,
                data_directory: "./data".to_string(),
            },
            security: SecuritySettings {
                air_gapped_mode: false,
                network_policy: "default-deny".to_string(),
                encrypt_data: false,
                log_redaction: true,
                citation_policy: true,
                permission_level: "restricted".to_string(),
                audit_logging: true,
            },
        }
    }
}

/// Get current application settings
#[tauri::command]
pub async fn get_app_settings(
    manager: State<'_, Manager>
) -> Result<AppSettings, String> {
    // For MVP, return default settings
    // TODO: Load from configuration file or database
    let app_state = manager.get_app_state().await;
    let state = app_state.read().await;

    // Get MCP server status from actual state
    let mcp_status = if state.mcp_server_running {
        "running"
    } else {
        "stopped"
    };

    let mut settings = AppSettings::default();
    settings.server.mcp_server_status = mcp_status.to_string();

    Ok(settings)
}

/// Update application settings
#[tauri::command]
pub async fn update_app_settings(
    manager: State<'_, Manager>,
    settings: AppSettings
) -> Result<AppSettings, String> {
    // TODO: Validate settings and save to configuration
    println!("Updating app settings: {:?}", settings);

    // Update MCP server status if needed
    let app_state = manager.get_app_state().await;
    {
        let mut state = app_state.write().await;

        // Update air-gapped mode
        if state.air_gapped_mode != settings.security.air_gapped_mode {
            state.air_gapped_mode = settings.security.air_gapped_mode;
            println!("Air-gapped mode set to: {}", settings.security.air_gapped_mode);
        }
    }

    Ok(settings)
}

/// Start MCP server
#[tauri::command]
pub async fn start_mcp_server(
    manager: State<'_, Manager>
) -> Result<String, String> {
    println!("Starting MCP server...");

    let app_state = manager.get_app_state().await;
    {
        let mut state = app_state.write().await;
        state.mcp_server_running = true;
    }

    // TODO: Actually start the MCP server process

    Ok("MCP server started successfully".to_string())
}

/// Stop MCP server
#[tauri::command]
pub async fn stop_mcp_server(
    manager: State<'_, Manager>
) -> Result<String, String> {
    println!("Stopping MCP server...");

    let app_state = manager.get_app_state().await;
    {
        let mut state = app_state.write().await;
        state.mcp_server_running = false;
    }

    // TODO: Actually stop the MCP server process

    Ok("MCP server stopped successfully".to_string())
}

/// Get MCP server status
#[tauri::command]
pub async fn get_mcp_server_status(
    manager: State<'_, Manager>
) -> Result<ServerSettings, String> {
    let app_state = manager.get_app_state().await;
    let state = app_state.read().await;

    let status = if state.mcp_server_running {
        "running"
    } else {
        "stopped"
    };

    Ok(ServerSettings {
        mcp_server_enabled: true,
        mcp_server_port: 3000,
        mcp_server_status: status.to_string(),
        max_connections: 100,
        request_timeout: 30,
        health_check_interval: 30,
    })
}

/// Select data directory using system dialog
#[tauri::command]
pub async fn select_data_directory() -> Result<Option<String>, String> {
    // TODO: Implement directory selection dialog with Tauri v2 API
    // For now, return a placeholder
    Ok(Some("./data".to_string()))
}

/// Clear application cache
#[tauri::command]
pub async fn clear_application_cache(
    _manager: State<'_, Manager>
) -> Result<String, String> {
    println!("Clearing application cache...");

    // TODO: Clear actual cache through cache service

    Ok("Cache cleared successfully".to_string())
}

/// Export application settings
#[tauri::command]
pub async fn export_settings(
    manager: State<'_, Manager>
) -> Result<String, String> {
    let settings = get_app_settings(manager).await?;

    // TODO: Export to file
    let json = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    Ok(json)
}

/// Import application settings
#[tauri::command]
pub async fn import_settings(
    manager: State<'_, Manager>,
    settings_json: String
) -> Result<AppSettings, String> {
    let settings: AppSettings = serde_json::from_str(&settings_json)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    update_app_settings(manager, settings.clone()).await?;

    Ok(settings)
}