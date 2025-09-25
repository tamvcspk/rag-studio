/*!
* Batch Processing for Embedding Worker
*
* Handles batch operations for efficient processing of multiple embedding requests.
* Optimizes performance by grouping requests and processing them in batches.
*/

use anyhow::Result;
use std::collections::HashMap;
use tracing::{debug, info};

use crate::protocol::{EmbeddingRequest, EmbeddingResponse};
use crate::python_ai::PythonAI;

/// Batch processor for embedding operations
pub struct BatchProcessor {
    /// Maximum batch size for processing
    max_batch_size: usize,
    /// Batch processing timeout in milliseconds
    batch_timeout_ms: u64,
}

impl BatchProcessor {
    /// Create new batch processor with default settings
    pub fn new() -> Self {
        Self {
            max_batch_size: 32, // Process up to 32 embeddings at once
            batch_timeout_ms: 5000, // 5 second timeout for batch operations
        }
    }

    /// Create batch processor with custom settings
    pub fn with_settings(max_batch_size: usize, batch_timeout_ms: u64) -> Self {
        Self {
            max_batch_size,
            batch_timeout_ms,
        }
    }

    /// Process a batch of embedding requests
    pub async fn process_embedding_batch(
        &self,
        python_ai: &mut PythonAI,
        requests: Vec<EmbeddingRequest>
    ) -> Result<Vec<EmbeddingResponse>> {
        if requests.is_empty() {
            return Ok(vec![]);
        }

        let total_requests = requests.len();
        info!("📦 Processing batch of {} embedding requests", total_requests);

        let mut responses = Vec::with_capacity(total_requests);

        // Process in chunks to respect max_batch_size
        for (batch_idx, chunk) in requests.chunks(self.max_batch_size).enumerate() {
            debug!("🔄 Processing batch {}/{} ({} items)",
                batch_idx + 1,
                (total_requests + self.max_batch_size - 1) / self.max_batch_size,
                chunk.len()
            );

            // For MVP, we process each request individually
            // Future optimization: implement true batch processing in Python
            for request in chunk {
                match python_ai.generate_embeddings(request.clone()).await {
                    Ok(response) => responses.push(response),
                    Err(e) => {
                        // Create error response for failed request
                        let error_response = EmbeddingResponse {
                            id: request.id.clone(),
                            embedding: vec![], // Empty embedding indicates error
                            model: "error".to_string(),
                            processing_time_ms: 0,
                            token_count: None,
                        };
                        responses.push(error_response);
                        debug!("❌ Failed to process embedding {}: {}", request.id, e);
                    }
                }
            }
        }

        info!("✅ Completed batch processing: {}/{} successful",
            responses.iter().filter(|r| !r.embedding.is_empty()).count(),
            total_requests
        );

        Ok(responses)
    }

    /// Optimize batch order for better processing efficiency
    pub fn optimize_batch_order(&self, mut requests: Vec<EmbeddingRequest>) -> Vec<EmbeddingRequest> {
        // Sort by text length (shorter texts first for better batching)
        requests.sort_by_key(|r| r.text.len());

        debug!("📊 Optimized batch order for {} requests", requests.len());
        requests
    }

    /// Group requests by model for model-specific batching
    pub fn group_by_model(&self, requests: Vec<EmbeddingRequest>) -> HashMap<String, Vec<EmbeddingRequest>> {
        let mut groups: HashMap<String, Vec<EmbeddingRequest>> = HashMap::new();

        for request in requests {
            let model = request.model.as_deref().unwrap_or("default").to_string();
            groups.entry(model).or_insert_with(Vec::new).push(request);
        }

        debug!("📊 Grouped requests into {} model groups", groups.len());
        groups
    }

    /// Calculate optimal batch size based on text lengths
    pub fn calculate_optimal_batch_size(&self, requests: &[EmbeddingRequest]) -> usize {
        if requests.is_empty() {
            return self.max_batch_size;
        }

        // Calculate average text length
        let avg_length: f64 = requests.iter()
            .map(|r| r.text.len())
            .sum::<usize>() as f64 / requests.len() as f64;

        // Adjust batch size based on average text length
        let optimal_size = if avg_length > 1000.0 {
            // Longer texts: smaller batches
            (self.max_batch_size / 2).max(1)
        } else if avg_length < 200.0 {
            // Shorter texts: larger batches
            self.max_batch_size
        } else {
            // Medium texts: default batch size
            (self.max_batch_size * 3 / 4).max(1)
        };

        debug!("📊 Calculated optimal batch size: {} (avg length: {:.1})", optimal_size, avg_length);
        optimal_size
    }

    /// Get batch processing statistics
    pub fn get_stats(&self) -> BatchStats {
        BatchStats {
            max_batch_size: self.max_batch_size,
            batch_timeout_ms: self.batch_timeout_ms,
        }
    }
}

/// Batch processing statistics
#[derive(Debug, Clone)]
pub struct BatchStats {
    pub max_batch_size: usize,
    pub batch_timeout_ms: u64,
}

impl Default for BatchProcessor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::protocol::EmbeddingParameters;

    fn create_test_request(id: &str, text: &str) -> EmbeddingRequest {
        EmbeddingRequest {
            id: id.to_string(),
            text: text.to_string(),
            model: None,
            parameters: Some(EmbeddingParameters::default()),
        }
    }

    #[test]
    fn test_batch_processor_creation() {
        let processor = BatchProcessor::new();
        assert_eq!(processor.max_batch_size, 32);
        assert_eq!(processor.batch_timeout_ms, 5000);
    }

    #[test]
    fn test_optimize_batch_order() {
        let processor = BatchProcessor::new();
        let requests = vec![
            create_test_request("1", "This is a very long text that should be processed later in the batch"),
            create_test_request("2", "Short text"),
            create_test_request("3", "Medium length text here"),
            create_test_request("4", "Hi"),
        ];

        let optimized = processor.optimize_batch_order(requests);

        // Should be sorted by text length (shortest first)
        assert_eq!(optimized[0].id, "4"); // "Hi" - shortest
        assert_eq!(optimized[1].id, "2"); // "Short text"

        // Verify all requests are preserved
        assert_eq!(optimized.len(), 4);
    }

    #[test]
    fn test_group_by_model() {
        let processor = BatchProcessor::new();
        let requests = vec![
            EmbeddingRequest {
                id: "1".to_string(),
                text: "test1".to_string(),
                model: Some("model-a".to_string()),
                parameters: None,
            },
            EmbeddingRequest {
                id: "2".to_string(),
                text: "test2".to_string(),
                model: Some("model-b".to_string()),
                parameters: None,
            },
            EmbeddingRequest {
                id: "3".to_string(),
                text: "test3".to_string(),
                model: Some("model-a".to_string()),
                parameters: None,
            },
            EmbeddingRequest {
                id: "4".to_string(),
                text: "test4".to_string(),
                model: None, // Should default to "default"
                parameters: None,
            },
        ];

        let groups = processor.group_by_model(requests);

        assert_eq!(groups.len(), 3); // model-a, model-b, default
        assert_eq!(groups.get("model-a").unwrap().len(), 2);
        assert_eq!(groups.get("model-b").unwrap().len(), 1);
        assert_eq!(groups.get("default").unwrap().len(), 1);
    }

    #[test]
    fn test_calculate_optimal_batch_size() {
        let processor = BatchProcessor::new();

        // Test with short texts
        let short_requests = vec![
            create_test_request("1", "Hi"),
            create_test_request("2", "Hello"),
            create_test_request("3", "Test"),
        ];
        let short_batch_size = processor.calculate_optimal_batch_size(&short_requests);
        assert_eq!(short_batch_size, 32); // Should use max batch size for short texts

        // Test with long texts
        let long_text = "This is a very long text ".repeat(50); // ~1250 characters
        let long_requests = vec![
            create_test_request("1", &long_text),
            create_test_request("2", &long_text),
        ];
        let long_batch_size = processor.calculate_optimal_batch_size(&long_requests);
        assert_eq!(long_batch_size, 16); // Should use smaller batch size for long texts
    }

    #[test]
    fn test_get_stats() {
        let processor = BatchProcessor::with_settings(16, 3000);
        let stats = processor.get_stats();

        assert_eq!(stats.max_batch_size, 16);
        assert_eq!(stats.batch_timeout_ms, 3000);
    }
}