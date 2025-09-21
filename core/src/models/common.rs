/*!
 * Common Shared Models
 *
 * DTOs and shared data structures used across the application.
 */

use serde::{Deserialize, Serialize};

/// Common pagination parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationParams {
    pub page: Option<usize>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}

impl Default for PaginationParams {
    fn default() -> Self {
        Self {
            page: Some(1),
            limit: Some(50),
            offset: None,
        }
    }
}

/// Common filter parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterParams {
    pub query: Option<String>,
    pub filters: Option<std::collections::HashMap<String, serde_json::Value>>,
    pub sort_by: Option<String>,
    pub sort_order: Option<SortOrder>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SortOrder {
    Asc,
    Desc,
}

/// Common API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub pagination: Option<PaginationInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationInfo {
    pub page: usize,
    pub limit: usize,
    pub total: usize,
    pub pages: usize,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResponse {
    pub status: String,
    pub version: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub components: std::collections::HashMap<String, ComponentHealth>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentHealth {
    pub status: String,
    pub details: Option<serde_json::Value>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pagination_params_default() {
        let params = PaginationParams::default();
        assert_eq!(params.page, Some(1));
        assert_eq!(params.limit, Some(50));
        assert_eq!(params.offset, None);
    }

    #[test]
    fn test_api_response_creation() {
        let response: ApiResponse<String> = ApiResponse {
            success: true,
            data: Some("test data".to_string()),
            error: None,
            pagination: None,
        };

        assert!(response.success);
        assert_eq!(response.data, Some("test data".to_string()));
    }
}