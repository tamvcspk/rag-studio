/*!
* JSON Protocol Definitions for Embedding Worker Communication
*
* Defines request/response messages for communication between the main process
* and the embedding worker subprocess over stdin/stdout.
*
* Protocol: JSON messages, one per line
* Transport: stdin/stdout (MVP), upgrade path to UDS/bincode
*/

use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Worker request messages from main process to embedding worker
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WorkerRequest {
    /// Health check / ping request
    Ping {
        request_id: Uuid,
    },

    /// Health status request
    Health {
        request_id: Uuid,
    },

    /// Single embedding generation request
    Embedding {
        request_id: Uuid,
        embedding_request: EmbeddingRequest,
    },

    /// Document reranking request
    Reranking {
        request_id: Uuid,
        reranking_request: RerankingRequest,
    },

    /// Batch embedding processing request
    BatchEmbedding {
        request_id: Uuid,
        batch_requests: Vec<EmbeddingRequest>,
    },

    /// Shutdown worker request
    Shutdown {
        request_id: Uuid,
    },
}

impl WorkerRequest {
    /// Extract request ID for correlation
    pub fn request_id(&self) -> Uuid {
        match self {
            WorkerRequest::Ping { request_id } => *request_id,
            WorkerRequest::Health { request_id } => *request_id,
            WorkerRequest::Embedding { request_id, .. } => *request_id,
            WorkerRequest::Reranking { request_id, .. } => *request_id,
            WorkerRequest::BatchEmbedding { request_id, .. } => *request_id,
            WorkerRequest::Shutdown { request_id } => *request_id,
        }
    }
}

/// Worker response messages from embedding worker to main process
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WorkerResponse {
    /// Pong response to ping
    Pong {
        request_id: Uuid,
    },

    /// Health status response
    Health {
        request_id: Uuid,
        status: HealthStatus,
    },

    /// Embedding generation response
    Embedding {
        request_id: Uuid,
        embedding_response: EmbeddingResponse,
    },

    /// Document reranking response
    Reranking {
        request_id: Uuid,
        reranking_response: RerankingResponse,
    },

    /// Batch embedding response
    BatchEmbedding {
        request_id: Uuid,
        batch_responses: Vec<EmbeddingResponse>,
    },

    /// Shutdown acknowledgment
    Shutdown {
        request_id: Uuid,
    },

    /// Error response
    Error {
        request_id: Uuid,
        error: String,
    },
}

/// Embedding request payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingRequest {
    /// Unique ID for this embedding request
    pub id: String,

    /// Text content to embed
    pub text: String,

    /// Optional model name (defaults to configured model)
    pub model: Option<String>,

    /// Optional embedding parameters
    pub parameters: Option<EmbeddingParameters>,
}

/// Embedding response payload
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingResponse {
    /// Request ID for correlation
    pub id: String,

    /// Generated embedding vector
    pub embedding: Vec<f32>,

    /// Model used for embedding
    pub model: String,

    /// Processing time in milliseconds
    pub processing_time_ms: u64,

    /// Token count (if available)
    pub token_count: Option<usize>,
}

/// Document reranking request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RerankingRequest {
    /// Query text for reranking
    pub query: String,

    /// Documents to rerank
    pub documents: Vec<DocumentToRerank>,

    /// Maximum number of documents to return
    pub top_k: Option<usize>,

    /// Optional reranking model
    pub model: Option<String>,
}

/// Document to rerank
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentToRerank {
    /// Document ID for correlation
    pub id: String,

    /// Document text content
    pub text: String,

    /// Optional metadata
    pub metadata: Option<serde_json::Value>,
}

/// Reranking response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RerankingResponse {
    /// Reranked documents with scores
    pub documents: Vec<RankedDocument>,

    /// Model used for reranking
    pub model: String,

    /// Processing time in milliseconds
    pub processing_time_ms: u64,
}

/// Reranked document with score
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankedDocument {
    /// Document ID
    pub id: String,

    /// Document text
    pub text: String,

    /// Reranking relevance score
    pub score: f32,

    /// Original rank in input list
    pub original_rank: usize,

    /// Optional metadata
    pub metadata: Option<serde_json::Value>,
}

/// Embedding generation parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingParameters {
    /// Normalize embeddings (default: true)
    pub normalize: Option<bool>,

    /// Truncate long texts (default: true)
    pub truncate: Option<bool>,

    /// Maximum sequence length
    pub max_length: Option<usize>,
}

/// Worker health status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    /// Worker status
    pub status: String,

    /// Python interpreter status
    pub python_ready: bool,

    /// Available models
    pub models: Vec<String>,

    /// Memory usage in MB
    pub memory_mb: Option<f64>,

    /// Uptime in seconds
    pub uptime_seconds: u64,

    /// Number of processed requests
    pub processed_requests: u64,

    /// Average processing time in milliseconds
    pub avg_processing_time_ms: Option<f64>,
}

impl Default for EmbeddingParameters {
    fn default() -> Self {
        Self {
            normalize: Some(true),
            truncate: Some(true),
            max_length: Some(512),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_serialization() {
        let request = WorkerRequest::Ping {
            request_id: Uuid::new_v4(),
        };

        let json = serde_json::to_string(&request).unwrap();
        let parsed: WorkerRequest = serde_json::from_str(&json).unwrap();

        match (request, parsed) {
            (WorkerRequest::Ping { request_id: id1 }, WorkerRequest::Ping { request_id: id2 }) => {
                assert_eq!(id1, id2);
            }
            _ => panic!("Request serialization failed"),
        }
    }

    #[test]
    fn test_response_serialization() {
        let response = WorkerResponse::Pong {
            request_id: Uuid::new_v4(),
        };

        let json = serde_json::to_string(&response).unwrap();
        let parsed: WorkerResponse = serde_json::from_str(&json).unwrap();

        match (response, parsed) {
            (WorkerResponse::Pong { request_id: id1 }, WorkerResponse::Pong { request_id: id2 }) => {
                assert_eq!(id1, id2);
            }
            _ => panic!("Response serialization failed"),
        }
    }

    #[test]
    fn test_embedding_request() {
        let request = EmbeddingRequest {
            id: "test-123".to_string(),
            text: "This is a test document".to_string(),
            model: Some("all-MiniLM-L6-v2".to_string()),
            parameters: Some(EmbeddingParameters::default()),
        };

        let json = serde_json::to_string(&request).unwrap();
        let parsed: EmbeddingRequest = serde_json::from_str(&json).unwrap();

        assert_eq!(request.id, parsed.id);
        assert_eq!(request.text, parsed.text);
        assert_eq!(request.model, parsed.model);
    }

    #[test]
    fn test_health_status() {
        let status = HealthStatus {
            status: "healthy".to_string(),
            python_ready: true,
            models: vec!["all-MiniLM-L6-v2".to_string()],
            memory_mb: Some(128.5),
            uptime_seconds: 3600,
            processed_requests: 150,
            avg_processing_time_ms: Some(25.4),
        };

        let json = serde_json::to_string(&status).unwrap();
        let parsed: HealthStatus = serde_json::from_str(&json).unwrap();

        assert_eq!(status.status, parsed.status);
        assert_eq!(status.python_ready, parsed.python_ready);
        assert_eq!(status.models, parsed.models);
        assert_eq!(status.processed_requests, parsed.processed_requests);
    }
}