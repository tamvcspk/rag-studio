import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { invoke } from "@tauri-apps/api/core";

@Component({
  selector: "app-root",
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  greetingMessage = "";
  rustPythonMessage = "";
  rustPythonDirectMessage = "";
  ragSearchMessage = "";
  pythonLibrariesMessage = "";
  advancedTextMessage = "";
  pythonSystemInfoMessage = "";

  greet(event: SubmitEvent, name: string): void {
    event.preventDefault();

    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    invoke<string>("greet", { name }).then((text) => {
      this.greetingMessage = text;
    });
  }


  // New methods to test Rust calling Python directly
  async rustCallPython(event: SubmitEvent, name: string): Promise<void> {
    event.preventDefault();

    try {
      const result = await invoke<string>("rust_call_python", { name });
      this.rustPythonMessage = result;
    } catch (error) {
      this.rustPythonMessage = `Error: ${error}`;
      console.error('Rust-Python call error:', error);
    }
  }

  async rustCallPythonDirect(): Promise<void> {
    try {
      const result = await invoke<string>("rust_call_python_direct", { x: 15, y: 25 });
      this.rustPythonDirectMessage = `Calculation result: ${result}`;
    } catch (error) {
      this.rustPythonDirectMessage = `Error: ${error}`;
      console.error('Rust-Python direct call error:', error);
    }
  }

  async ragSearch(event: SubmitEvent, query: string): Promise<void> {
    event.preventDefault();
    
    try {
      const result = await invoke<string>("rust_call_rag_search", { query });
      this.ragSearchMessage = `RAG Search Results:\n${result}`;
    } catch (error) {
      this.ragSearchMessage = `Error: ${error}`;
      console.error('RAG search error:', error);
    }
  }

  // PyOxidizer POC methods
  async testPythonLibraries(): Promise<void> {
    try {
      const result = await invoke<string>("test_python_libraries");
      this.pythonLibrariesMessage = `Library Test Results:\n${result}`;
    } catch (error) {
      this.pythonLibrariesMessage = `Error: ${error}`;
      console.error('Python libraries test error:', error);
    }
  }

  async advancedTextProcessing(event: SubmitEvent, text: string): Promise<void> {
    event.preventDefault();
    
    try {
      const result = await invoke<string>("advanced_python_text_processing", { text });
      this.advancedTextMessage = `Advanced Text Processing Results:\n${result}`;
    } catch (error) {
      this.advancedTextMessage = `Error: ${error}`;
      console.error('Advanced text processing error:', error);
    }
  }

  async getPythonSystemInfo(): Promise<void> {
    try {
      const result = await invoke<string>("get_python_system_info");
      this.pythonSystemInfoMessage = `Python System Information:\n${result}`;
    } catch (error) {
      this.pythonSystemInfoMessage = `Error: ${error}`;
      console.error('Python system info error:', error);
    }
  }
}
