/*!
 * Pipeline Templates for KB Creation
 *
 * Implements the KB creation Pipeline templates as specified in CORE_DESIGN.md Section 3.1.
 * These templates provide unified ETL workflows for different content sources,
 * eliminating the architectural overlap between KB creation and Pipeline systems.
 */

use lazy_static::lazy_static;
use std::collections::HashMap;
use serde_json::json;

use super::models::*;

// Template registry - KB Creation templates as specified in CORE_DESIGN.md
lazy_static! {
    pub static ref KB_CREATION_TEMPLATES: Vec<PipelineTemplate> = vec![
        create_local_folder_template(),
        create_web_documentation_template(),
        create_github_repository_template(),
        create_pdf_collection_template(),
    ];
}

/// Get a specific KB creation template by ID
pub fn get_kb_creation_template(template_id: &str) -> Option<PipelineTemplate> {
    KB_CREATION_TEMPLATES.iter().find(|t| t.id == template_id).cloned()
}

/// Local Folder Template - as specified in CORE_DESIGN.md lines 385-407
fn create_local_folder_template() -> PipelineTemplate {
    let mut parameters = HashMap::new();

    parameters.insert("sourceUrl".to_string(), PipelineParameter {
        name: "sourceUrl".to_string(),
        param_type: ParameterType::String,
        description: "Local directory path".to_string(),
        required: true,
        default_value: None,
        validation: None,
    });

    parameters.insert("embeddingModel".to_string(), PipelineParameter {
        name: "embeddingModel".to_string(),
        param_type: ParameterType::String,
        description: "Embedding model for vector generation".to_string(),
        required: true,
        default_value: Some(json!("all-MiniLM-L6-v2")),
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: None,
            enum_values: Some(vec![
                json!("all-MiniLM-L6-v2"),
                json!("all-mpnet-base-v2"),
                json!("e5-large-v2")
            ]),
            custom_validator: None,
        }),
    });

    parameters.insert("name".to_string(), PipelineParameter {
        name: "name".to_string(),
        param_type: ParameterType::String,
        description: "Knowledge base name".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(100.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\s\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("product".to_string(), PipelineParameter {
        name: "product".to_string(),
        param_type: ParameterType::String,
        description: "Product/domain identifier".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(50.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("version".to_string(), PipelineParameter {
        name: "version".to_string(),
        param_type: ParameterType::String,
        description: "Knowledge base version".to_string(),
        required: true,
        default_value: Some(json!("1.0.0")),
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: Some("^\\d+\\.\\d+\\.\\d+.*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("description".to_string(), PipelineParameter {
        name: "description".to_string(),
        param_type: ParameterType::String,
        description: "Knowledge base description (optional)".to_string(),
        required: false,
        default_value: Some(json!("")),
        validation: Some(ParameterValidation {
            min: None,
            max: Some(500.0),
            pattern: None,
            enum_values: None,
            custom_validator: None,
        }),
    });

    let steps = vec![
        PipelineStep {
            id: "fetch".to_string(),
            name: "Fetch Data".to_string(),
            step_type: ETLStepType::Fetch,
            config: HashMap::from([
                ("source".to_string(), json!("local-folder")),
                ("path".to_string(), json!("{{sourceUrl}}")),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "sourceUrl".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "files".to_string(),
                    output_type: StepIOType::Data,
                    description: "List of files found in the local directory".to_string(),
                }
            ],
            dependencies: vec![],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 1000,
                backoff_multiplier: 2.0,
                max_delay: 10000,
            }),
            timeout: Some(300), // 5 minutes
            parallelizable: false,
        },
        PipelineStep {
            id: "parse".to_string(),
            name: "Parse Documents".to_string(),
            step_type: ETLStepType::Parse,
            config: HashMap::from([
                ("formats".to_string(), json!(["pdf", "md", "txt", "docx"])),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "files".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("fetch".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "parsed_documents".to_string(),
                    output_type: StepIOType::Data,
                    description: "Parsed document content with metadata".to_string(),
                }
            ],
            dependencies: vec!["fetch".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 2000,
                backoff_multiplier: 2.0,
                max_delay: 20000,
            }),
            timeout: Some(900), // 15 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "normalize".to_string(),
            name: "Normalize Content".to_string(),
            step_type: ETLStepType::Normalize,
            config: HashMap::from([
                ("cleanMarkdown".to_string(), json!(true)),
                ("deduplication".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "parsed_documents".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("parse".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "normalized_documents".to_string(),
                    output_type: StepIOType::Data,
                    description: "Normalized and deduplicated documents".to_string(),
                }
            ],
            dependencies: vec!["parse".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(600), // 10 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "chunk".to_string(),
            name: "Chunk Text".to_string(),
            step_type: ETLStepType::Chunk,
            config: HashMap::from([
                ("strategy".to_string(), json!("semantic")),
                ("maxTokens".to_string(), json!(512)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "normalized_documents".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("normalize".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "chunks".to_string(),
                    output_type: StepIOType::Data,
                    description: "Text chunks with metadata".to_string(),
                }
            ],
            dependencies: vec!["normalize".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(1200), // 20 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "embed".to_string(),
            name: "Generate Embeddings".to_string(),
            step_type: ETLStepType::Embed,
            config: HashMap::from([
                ("model".to_string(), json!("{{embeddingModel}}")),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "chunks".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("chunk".to_string()),
                    default_value: None,
                },
                PipelineStepInput {
                    name: "embeddingModel".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "embedded_chunks".to_string(),
                    output_type: StepIOType::Data,
                    description: "Chunks with embeddings".to_string(),
                }
            ],
            dependencies: vec!["chunk".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 5000,
                backoff_multiplier: 2.0,
                max_delay: 30000,
            }),
            timeout: Some(3600), // 1 hour
            parallelizable: true,
        },
        PipelineStep {
            id: "index".to_string(),
            name: "Build Index".to_string(),
            step_type: ETLStepType::Index,
            config: HashMap::from([
                ("vectorDb".to_string(), json!("lancedb")),
                ("sqlDb".to_string(), json!("sqlite")),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "embedded_chunks".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("embed".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "index_stats".to_string(),
                    output_type: StepIOType::Data,
                    description: "Indexing statistics and health metrics".to_string(),
                }
            ],
            dependencies: vec!["embed".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 2000,
                backoff_multiplier: 2.0,
                max_delay: 10000,
            }),
            timeout: Some(1800), // 30 minutes
            parallelizable: false,
        },
        PipelineStep {
            id: "eval".to_string(),
            name: "Evaluate Quality".to_string(),
            step_type: ETLStepType::Eval,
            config: HashMap::from([
                ("validateRecall".to_string(), json!(true)),
                ("qualityThreshold".to_string(), json!(0.8)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "index_stats".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("index".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "eval_results".to_string(),
                    output_type: StepIOType::Data,
                    description: "Quality evaluation results".to_string(),
                }
            ],
            dependencies: vec!["index".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(600), // 10 minutes
            parallelizable: false,
        },
        PipelineStep {
            id: "pack".to_string(),
            name: "Create Knowledge Base".to_string(),
            step_type: ETLStepType::Pack,
            config: HashMap::from([
                ("createKB".to_string(), json!(true)),
                ("name".to_string(), json!("{{name}}")),
                ("product".to_string(), json!("{{product}}")),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "eval_results".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("eval".to_string()),
                    default_value: None,
                },
                PipelineStepInput {
                    name: "name".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                },
                PipelineStepInput {
                    name: "product".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "knowledge_base".to_string(),
                    output_type: StepIOType::Data,
                    description: "Created knowledge base metadata".to_string(),
                }
            ],
            dependencies: vec!["eval".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(300), // 5 minutes
            parallelizable: false,
        },
    ];

    PipelineTemplate {
        id: "kb-creation-local-folder".to_string(),
        name: "KB Creation - Local Folder".to_string(),
        description: "Create a knowledge base from documents in a local directory".to_string(),
        category: PipelineTemplateCategory::DataIngestion,
        spec: PipelineSpec {
            version: "1.0.0".to_string(),
            steps,
            parameters,
            resources: Some(PipelineResources {
                cpu: Some(2.0),
                memory: Some(2048), // 2GB
                disk: Some(5120),   // 5GB
                timeout: Some(7200), // 2 hours
                max_parallel_steps: Some(4),
            }),
            triggers: vec![],
        },
        author: "RAG Studio".to_string(),
        version: "1.0.0".to_string(),
        tags: vec!["kb-creation".to_string(), "local-folder".to_string(), "etl".to_string()],
    }
}

/// Web Documentation Template - as specified in CORE_DESIGN.md lines 409-425
fn create_web_documentation_template() -> PipelineTemplate {
    let mut parameters = HashMap::new();

    parameters.insert("sourceUrl".to_string(), PipelineParameter {
        name: "sourceUrl".to_string(),
        param_type: ParameterType::String,
        description: "Base URL for web documentation crawling".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: Some("^https?://.+$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("embeddingModel".to_string(), PipelineParameter {
        name: "embeddingModel".to_string(),
        param_type: ParameterType::String,
        description: "Embedding model for vector generation".to_string(),
        required: true,
        default_value: Some(json!("all-MiniLM-L6-v2")),
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: None,
            enum_values: Some(vec![
                json!("all-MiniLM-L6-v2"),
                json!("all-mpnet-base-v2"),
                json!("e5-large-v2")
            ]),
            custom_validator: None,
        }),
    });

    parameters.insert("name".to_string(), PipelineParameter {
        name: "name".to_string(),
        param_type: ParameterType::String,
        description: "Knowledge base name".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(100.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\s\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("product".to_string(), PipelineParameter {
        name: "product".to_string(),
        param_type: ParameterType::String,
        description: "Product/domain identifier".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(50.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    let steps = vec![
        PipelineStep {
            id: "fetch".to_string(),
            name: "Crawl Web Documentation".to_string(),
            step_type: ETLStepType::Fetch,
            config: HashMap::from([
                ("source".to_string(), json!("web-crawler")),
                ("baseUrl".to_string(), json!("{{sourceUrl}}")),
                ("respectRobots".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "sourceUrl".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "pages".to_string(),
                    output_type: StepIOType::Data,
                    description: "Crawled web pages with metadata".to_string(),
                }
            ],
            dependencies: vec![],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 2000,
                backoff_multiplier: 2.0,
                max_delay: 20000,
            }),
            timeout: Some(1800), // 30 minutes
            parallelizable: false,
        },
        PipelineStep {
            id: "parse".to_string(),
            name: "Parse Web Content".to_string(),
            step_type: ETLStepType::Parse,
            config: HashMap::from([
                ("extractMainContent".to_string(), json!(true)),
                ("removeNav".to_string(), json!(true)),
                ("preserveLinks".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "pages".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("fetch".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "parsed_documents".to_string(),
                    output_type: StepIOType::Data,
                    description: "Parsed web content with preserved structure".to_string(),
                }
            ],
            dependencies: vec!["fetch".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 2000,
                backoff_multiplier: 2.0,
                max_delay: 20000,
            }),
            timeout: Some(1200), // 20 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "normalize".to_string(),
            name: "Normalize Web Content".to_string(),
            step_type: ETLStepType::Normalize,
            config: HashMap::from([
                ("deduplication".to_string(), json!(true)),
                ("urlCanonical".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "parsed_documents".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("parse".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "normalized_documents".to_string(),
                    output_type: StepIOType::Data,
                    description: "Normalized web content with canonical URLs".to_string(),
                }
            ],
            dependencies: vec!["parse".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(600), // 10 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "chunk".to_string(),
            name: "Chunk Web Content".to_string(),
            step_type: ETLStepType::Chunk,
            config: HashMap::from([
                ("respectHeaders".to_string(), json!(true)),
                ("maxTokens".to_string(), json!(512)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "normalized_documents".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("normalize".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "chunks".to_string(),
                    output_type: StepIOType::Data,
                    description: "Web content chunks respecting document structure".to_string(),
                }
            ],
            dependencies: vec!["normalize".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(1200), // 20 minutes
            parallelizable: true,
        },
        // Include embed, index, eval, pack steps similar to local folder template
        // ... (similar steps as local folder template)
    ];

    PipelineTemplate {
        id: "kb-creation-web-documentation".to_string(),
        name: "KB Creation - Web Documentation".to_string(),
        description: "Create a knowledge base by crawling and indexing web documentation".to_string(),
        category: PipelineTemplateCategory::DataIngestion,
        spec: PipelineSpec {
            version: "1.0.0".to_string(),
            steps,
            parameters,
            resources: Some(PipelineResources {
                cpu: Some(2.0),
                memory: Some(3072), // 3GB (more for web content processing)
                disk: Some(10240),  // 10GB
                timeout: Some(10800), // 3 hours
                max_parallel_steps: Some(6),
            }),
            triggers: vec![],
        },
        author: "RAG Studio".to_string(),
        version: "1.0.0".to_string(),
        tags: vec!["kb-creation".to_string(), "web-documentation".to_string(), "crawler".to_string(), "etl".to_string()],
    }
}

/// GitHub Repository Template - as specified in CORE_DESIGN.md lines 427-439
fn create_github_repository_template() -> PipelineTemplate {
    let mut parameters = HashMap::new();

    parameters.insert("sourceUrl".to_string(), PipelineParameter {
        name: "sourceUrl".to_string(),
        param_type: ParameterType::String,
        description: "GitHub repository URL".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: Some("^https://github\\.com/[^/]+/[^/]+$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("embeddingModel".to_string(), PipelineParameter {
        name: "embeddingModel".to_string(),
        param_type: ParameterType::String,
        description: "Embedding model for vector generation".to_string(),
        required: true,
        default_value: Some(json!("all-MiniLM-L6-v2")),
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: None,
            enum_values: Some(vec![
                json!("all-MiniLM-L6-v2"),
                json!("all-mpnet-base-v2"),
                json!("e5-large-v2")
            ]),
            custom_validator: None,
        }),
    });

    parameters.insert("name".to_string(), PipelineParameter {
        name: "name".to_string(),
        param_type: ParameterType::String,
        description: "Knowledge base name".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(100.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\s\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("product".to_string(), PipelineParameter {
        name: "product".to_string(),
        param_type: ParameterType::String,
        description: "Product/domain identifier".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(50.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    let steps = vec![
        PipelineStep {
            id: "fetch".to_string(),
            name: "Clone Repository".to_string(),
            step_type: ETLStepType::Fetch,
            config: HashMap::from([
                ("source".to_string(), json!("git-clone")),
                ("repo".to_string(), json!("{{sourceUrl}}")),
                ("shallow".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "sourceUrl".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "files".to_string(),
                    output_type: StepIOType::Data,
                    description: "Repository files with git metadata".to_string(),
                }
            ],
            dependencies: vec![],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 5000,
                backoff_multiplier: 2.0,
                max_delay: 30000,
            }),
            timeout: Some(1800), // 30 minutes
            parallelizable: false,
        },
        PipelineStep {
            id: "parse".to_string(),
            name: "Parse Repository Content".to_string(),
            step_type: ETLStepType::Parse,
            config: HashMap::from([
                ("includeCode".to_string(), json!(true)),
                ("includeReadmes".to_string(), json!(true)),
                ("excludeBinary".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "files".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("fetch".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "parsed_documents".to_string(),
                    output_type: StepIOType::Data,
                    description: "Parsed code and documentation files".to_string(),
                }
            ],
            dependencies: vec!["fetch".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 2000,
                backoff_multiplier: 2.0,
                max_delay: 20000,
            }),
            timeout: Some(1200), // 20 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "normalize".to_string(),
            name: "Normalize Repository Content".to_string(),
            step_type: ETLStepType::Normalize,
            config: HashMap::from([
                ("respectGitignore".to_string(), json!(true)),
                ("pathNormalization".to_string(), json!(true)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "parsed_documents".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("parse".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "normalized_documents".to_string(),
                    output_type: StepIOType::Data,
                    description: "Normalized repository content with proper file paths".to_string(),
                }
            ],
            dependencies: vec!["parse".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(600), // 10 minutes
            parallelizable: true,
        },
        PipelineStep {
            id: "chunk".to_string(),
            name: "Chunk Code and Documentation".to_string(),
            step_type: ETLStepType::Chunk,
            config: HashMap::from([
                ("codeAware".to_string(), json!(true)),
                ("language".to_string(), json!("auto")),
                ("maxTokens".to_string(), json!(512)),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "normalized_documents".to_string(),
                    input_type: StepIOType::Data,
                    required: true,
                    source: Some("normalize".to_string()),
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "chunks".to_string(),
                    output_type: StepIOType::Data,
                    description: "Code-aware chunks with language and structure metadata".to_string(),
                }
            ],
            dependencies: vec!["normalize".to_string()],
            retry_policy: Some(RetryPolicy {
                max_attempts: 2,
                initial_delay: 1000,
                backoff_multiplier: 1.5,
                max_delay: 5000,
            }),
            timeout: Some(1800), // 30 minutes
            parallelizable: true,
        },
        // Include embed, index, eval, pack steps similar to other templates
        // ... (similar steps)
    ];

    PipelineTemplate {
        id: "kb-creation-github-repository".to_string(),
        name: "KB Creation - GitHub Repository".to_string(),
        description: "Create a knowledge base from a GitHub repository including code and documentation".to_string(),
        category: PipelineTemplateCategory::DataIngestion,
        spec: PipelineSpec {
            version: "1.0.0".to_string(),
            steps,
            parameters,
            resources: Some(PipelineResources {
                cpu: Some(2.0),
                memory: Some(4096), // 4GB (for large repositories)
                disk: Some(20480),  // 20GB
                timeout: Some(14400), // 4 hours
                max_parallel_steps: Some(8),
            }),
            triggers: vec![],
        },
        author: "RAG Studio".to_string(),
        version: "1.0.0".to_string(),
        tags: vec!["kb-creation".to_string(), "github".to_string(), "code".to_string(), "repository".to_string(), "etl".to_string()],
    }
}

/// PDF Collection Template - Additional template for PDF processing
fn create_pdf_collection_template() -> PipelineTemplate {
    let mut parameters = HashMap::new();

    parameters.insert("sourceUrl".to_string(), PipelineParameter {
        name: "sourceUrl".to_string(),
        param_type: ParameterType::String,
        description: "Directory path containing PDF files".to_string(),
        required: true,
        default_value: None,
        validation: None,
    });

    parameters.insert("embeddingModel".to_string(), PipelineParameter {
        name: "embeddingModel".to_string(),
        param_type: ParameterType::String,
        description: "Embedding model for vector generation".to_string(),
        required: true,
        default_value: Some(json!("all-MiniLM-L6-v2")),
        validation: Some(ParameterValidation {
            min: None,
            max: None,
            pattern: None,
            enum_values: Some(vec![
                json!("all-MiniLM-L6-v2"),
                json!("all-mpnet-base-v2"),
                json!("e5-large-v2")
            ]),
            custom_validator: None,
        }),
    });

    parameters.insert("name".to_string(), PipelineParameter {
        name: "name".to_string(),
        param_type: ParameterType::String,
        description: "Knowledge base name".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(100.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\s\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    parameters.insert("product".to_string(), PipelineParameter {
        name: "product".to_string(),
        param_type: ParameterType::String,
        description: "Product/domain identifier".to_string(),
        required: true,
        default_value: None,
        validation: Some(ParameterValidation {
            min: Some(2.0),
            max: Some(50.0),
            pattern: Some("^[a-zA-Z0-9][a-zA-Z0-9\\-_]*$".to_string()),
            enum_values: None,
            custom_validator: None,
        }),
    });

    let steps = vec![
        // Similar structure to other templates but optimized for PDF processing
        PipelineStep {
            id: "fetch".to_string(),
            name: "Collect PDF Files".to_string(),
            step_type: ETLStepType::Fetch,
            config: HashMap::from([
                ("source".to_string(), json!("local-folder")),
                ("path".to_string(), json!("{{sourceUrl}}")),
                ("fileTypes".to_string(), json!(["pdf"])),
            ]),
            inputs: vec![
                PipelineStepInput {
                    name: "sourceUrl".to_string(),
                    input_type: StepIOType::Config,
                    required: true,
                    source: None,
                    default_value: None,
                }
            ],
            outputs: vec![
                PipelineStepOutput {
                    name: "files".to_string(),
                    output_type: StepIOType::Data,
                    description: "List of PDF files found".to_string(),
                }
            ],
            dependencies: vec![],
            retry_policy: Some(RetryPolicy {
                max_attempts: 3,
                initial_delay: 1000,
                backoff_multiplier: 2.0,
                max_delay: 10000,
            }),
            timeout: Some(300), // 5 minutes
            parallelizable: false,
        },
        // Additional steps for PDF-specific processing...
    ];

    PipelineTemplate {
        id: "kb-creation-pdf-collection".to_string(),
        name: "KB Creation - PDF Collection".to_string(),
        description: "Create a knowledge base from a collection of PDF documents".to_string(),
        category: PipelineTemplateCategory::DocumentParsing,
        spec: PipelineSpec {
            version: "1.0.0".to_string(),
            steps,
            parameters,
            resources: Some(PipelineResources {
                cpu: Some(2.0),
                memory: Some(3072), // 3GB (for PDF processing)
                disk: Some(5120),   // 5GB
                timeout: Some(7200), // 2 hours
                max_parallel_steps: Some(4),
            }),
            triggers: vec![],
        },
        author: "RAG Studio".to_string(),
        version: "1.0.0".to_string(),
        tags: vec!["kb-creation".to_string(), "pdf".to_string(), "documents".to_string(), "etl".to_string()],
    }
}