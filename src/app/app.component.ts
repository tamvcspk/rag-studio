import { Component, OnInit, signal, computed } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";
import { invoke } from "@tauri-apps/api/core";
import { TabsModule } from 'primeng/tabs';
import { DashboardComponent } from './components/dashboard.component';
import { ToolsManagerComponent } from './components/tools-manager.component';
import { KnowledgeBaseManagerComponent } from './components/knowledge-base-manager.component';
import { PipelineDesignerComponent } from './components/pipeline-designer.component';
import { SettingsComponent } from './components/settings.component';

@Component({
  selector: "app-root",
  imports: [
    RouterOutlet, CommonModule, TabsModule, 
    DashboardComponent, ToolsManagerComponent, KnowledgeBaseManagerComponent,
    PipelineDesignerComponent, SettingsComponent
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit {
  // Active tab for navigation
  activeTab = 0;
  
  // Using signals for reactive state management
  greetingMessage = signal("");
  rustPythonMessage = signal("");
  
  // MCP server properties as signals
  mcpStatus = signal("Unknown");
  mcpHealthStatus = signal("");
  mcpServiceInfo = signal("");

  // Computed properties for better reactivity
  mcpDisplayStatus = computed(() => 
    this.mcpStatus().replace(/^"(.+)"$/, '$1')
  );
  
  mcpStatusClass = computed(() => {
    const status = this.mcpDisplayStatus();
    if (status === 'Running') return 'status-running';
    if (status === 'Starting') return 'status-starting';
    if (status === 'Stopped') return 'status-stopped';
    if (status.includes('Error')) return 'status-error';
    return 'status-unknown';
  });

  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage.set(text);
    });
  }


  // New methods to test Rust calling Python directly
  async rustCallPython(event: SubmitEvent, name: string): Promise<void> {
    event.preventDefault();

    try {
      const result = await invoke<string>("rust_call_python", { name });
      this.rustPythonMessage.set(result);
    } catch (error) {
      this.rustPythonMessage.set(`Error: ${error}`);
      console.error('Rust-Python call error:', error);
    }
  }


  // MCP Server Management Methods

  async getMcpStatus(): Promise<void> {
    try {
      const result = await invoke<string>("get_mcp_status");
      this.mcpStatus.set(result);
    } catch (error) {
      this.mcpStatus.set(`Error: ${error}`);
      console.error('MCP status error:', error);
    }
  }

  async getMcpHealthcheck(): Promise<void> {
    try {
      const result = await invoke<any>("get_mcp_healthcheck");
      this.mcpHealthStatus.set(JSON.stringify(result, null, 2));
    } catch (error) {
      this.mcpHealthStatus.set(`Error: ${error}`);
      console.error('MCP healthcheck error:', error);
    }
  }

  async getMcpServiceInfo(): Promise<void> {
    try {
      const result = await invoke<any>("get_mcp_service_info");
      this.mcpServiceInfo.set(JSON.stringify(result, null, 2));
    } catch (error) {
      this.mcpServiceInfo.set(`Error: ${error}`);
      console.error('MCP service info error:', error);
    }
  }

  async startMcpServer(): Promise<void> {
    try {
      const result = await invoke<string>("start_mcp_server");
      console.log('MCP server start result:', result);
      // Refresh status after starting
      await this.getMcpStatus();
      await this.getMcpHealthcheck();
    } catch (error) {
      console.error('MCP server start error:', error);
      await this.getMcpStatus(); // Refresh status even on error
    }
  }

  async stopMcpServer(): Promise<void> {
    try {
      const result = await invoke<string>("stop_mcp_server");
      console.log('MCP server stop result:', result);
      // Refresh status after stopping
      await this.getMcpStatus();
      this.mcpHealthStatus.set(""); // Clear health status when stopped
    } catch (error) {
      console.error('MCP server stop error:', error);
      await this.getMcpStatus(); // Refresh status even on error
    }
  }

  // Initialize MCP status on component load
  async ngOnInit(): Promise<void> {
    await this.getMcpStatus();
    await this.getMcpServiceInfo();
    
    // Try to get healthcheck - it might fail if server is not running
    try {
      await this.getMcpHealthcheck();
    } catch (error) {
      // Ignore healthcheck error on init - server might not be running yet
      console.log('Initial healthcheck failed (expected if server not running):', error);
    }

    // Set up periodic status updates
    setInterval(async () => {
      await this.getMcpStatus();
      try {
        await this.getMcpHealthcheck();
      } catch (error) {
        // Ignore periodic healthcheck errors
        this.mcpHealthStatus.set("Server not running or unhealthy");
      }
    }, 5000); // Update every 5 seconds
  }

}
