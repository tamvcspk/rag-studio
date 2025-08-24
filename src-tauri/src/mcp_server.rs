use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tokio::sync::oneshot;
use tokio::net::TcpListener;
use tokio::task::JoinHandle;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub enum McpStatus {
    Stopped,
    Starting,
    Running,
    Error(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagStudioService {
    pub name: String,
    pub version: String,
}

impl RagStudioService {
    pub fn new() -> Self {
        Self {
            name: "rag-studio-mcp".to_string(),
            version: "1.0.0".to_string(),
        }
    }

    // RAG search tool implementation
    pub async fn rag_search(&self, query: &str, kb_name: Option<&str>) -> Result<Value, String> {
        // TODO: Implement actual RAG search using Python integration
        Ok(json!({
            "results": [],
            "query": query,
            "kb_name": kb_name,
            "message": "RAG search not yet implemented - will integrate with Python RAG functions"
        }))
    }

    // Knowledge base listing
    pub async fn list_knowledge_bases(&self) -> Result<Value, String> {
        // TODO: Implement actual KB listing
        Ok(json!({
            "knowledge_bases": [],
            "message": "KB listing not yet implemented"
        }))
    }

    // Knowledge base creation
    pub async fn create_knowledge_base(&self, name: &str, description: Option<&str>) -> Result<Value, String> {
        // TODO: Implement actual KB creation
        Ok(json!({
            "success": true,
            "name": name,
            "description": description.unwrap_or(""),
            "message": "KB creation not yet implemented"
        }))
    }

    // Admin status
    pub async fn get_admin_status(&self) -> Result<Value, String> {
        Ok(json!({
            "status": "running",
            "version": self.version,
            "service": self.name,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "message": "RAG Studio MCP server is running"
        }))
    }
}

pub struct McpServerManager {
    status: Arc<Mutex<McpStatus>>,
    shutdown_tx: Option<oneshot::Sender<()>>,
    task_handle: Option<JoinHandle<()>>,
    service: RagStudioService,
    port: u16,
}

impl McpServerManager {
    pub fn new() -> Self {
        Self {
            status: Arc::new(Mutex::new(McpStatus::Stopped)),
            shutdown_tx: None,
            task_handle: None,
            service: RagStudioService::new(),
            port: 8080, // Default MCP server port
        }
    }

    pub fn get_status(&self) -> McpStatus {
        self.status.lock().unwrap().clone()
    }

    pub fn start(&mut self) -> Result<(), String> {
        // Check if already running
        let current_status = self.get_status();
        match current_status {
            McpStatus::Running | McpStatus::Starting => {
                return Err("MCP server is already running or starting".to_string());
            }
            _ => {}
        }

        let status = Arc::clone(&self.status);
        
        // Set status to starting
        {
            let mut status_lock = status.lock().unwrap();
            *status_lock = McpStatus::Starting;
        }

        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
        self.shutdown_tx = Some(shutdown_tx);

        // Clone status and service for the spawned task
        let task_status = Arc::clone(&status);
        let service = self.service.clone();
        let port = self.port;
        
        // Use the current runtime handle to spawn the task
        let task_handle = tokio::runtime::Handle::current().spawn(async move {
            match Self::run_mcp_server(task_status.clone(), service, port, shutdown_rx).await {
                Ok(_) => {
                    let mut status_lock = task_status.lock().unwrap();
                    *status_lock = McpStatus::Stopped;
                }
                Err(e) => {
                    let mut status_lock = task_status.lock().unwrap();
                    *status_lock = McpStatus::Error(e);
                }
            }
        });

        self.task_handle = Some(task_handle);
        Ok(())
    }

    async fn run_mcp_server(
        status: Arc<Mutex<McpStatus>>,
        service: RagStudioService,
        port: u16,
        mut shutdown_rx: oneshot::Receiver<()>
    ) -> Result<(), String> {
        // Create TCP listener for MCP server
        let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .map_err(|e| format!("Failed to bind to port {}: {}", port, e))?;

        // Set status to running
        {
            let mut status_lock = status.lock().unwrap();
            *status_lock = McpStatus::Running;
        }

        println!("RAG Studio MCP server started on port {}", port);

        // Simple server loop - in a real implementation, this would use the rmcp SDK
        // For now, we'll create a basic server that can be extended
        tokio::select! {
            result = async {
                loop {
                    match listener.accept().await {
                        Ok((_stream, addr)) => {
                            println!("MCP client connected from: {}", addr);
                            let service_clone = service.clone();
                            
                            tokio::spawn(async move {
                                // Handle MCP connection - simplified for now
                                // TODO: Implement full MCP protocol using rmcp SDK
                                println!("Handling MCP connection for {}", service_clone.name);
                            });
                        }
                        Err(e) => {
                            eprintln!("Failed to accept MCP connection: {}", e);
                        }
                    }
                }
            } => {
                Ok::<(), String>(result)
            }
            _ = &mut shutdown_rx => {
                println!("MCP server shutting down");
                Ok(())
            }
        }
    }

    pub fn stop(&mut self) -> Result<(), String> {
        // Send shutdown signal
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
        
        // Abort the task if it's running
        if let Some(handle) = self.task_handle.take() {
            handle.abort();
        }
        
        let mut status_lock = self.status.lock().unwrap();
        *status_lock = McpStatus::Stopped;
        
        Ok(())
    }

    pub fn healthcheck(&self) -> Result<Value, String> {
        let status = self.get_status();
        
        match status {
            McpStatus::Running => Ok(json!({
                "status": "healthy",
                "mcp_status": "running",
                "port": self.port,
                "service": self.service.name,
                "version": self.service.version,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })),
            McpStatus::Starting => Ok(json!({
                "status": "starting", 
                "mcp_status": "starting",
                "port": self.port,
                "timestamp": chrono::Utc::now().to_rfc3339()
            })),
            McpStatus::Stopped => Err("MCP server is stopped".to_string()),
            McpStatus::Error(e) => Err(format!("MCP server error: {}", e))
        }
    }

    pub fn get_port(&self) -> u16 {
        self.port
    }

    pub fn get_service_info(&self) -> Value {
        json!({
            "name": self.service.name,
            "version": self.service.version,
            "port": self.port,
            "status": format!("{:?}", self.get_status()),
            "tools": [
                "rag.search",
                "kb.list", 
                "kb.create",
                "admin.status"
            ]
        })
    }
}