import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  Play,
  Square,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  FileText,
  Copy,
  Download,
  Settings
} from 'lucide-angular';
import { RagDialog } from '../../semantic/overlay/rag-dialog/rag-dialog';
import { RagFormField } from '../../semantic/forms/rag-form-field/rag-form-field';
import { RagTextarea } from '../../atomic/primitives/rag-textarea/rag-textarea';
import { RagButton } from '../../atomic/primitives/rag-button/rag-button';
import { RagCard } from '../../semantic/data-display/rag-card/rag-card';
import { RagChip } from '../../atomic/primitives/rag-chip/rag-chip';
import { RagCodeBlock } from '../../semantic/data-display/rag-code-block/rag-code-block';
import { RagAlert } from '../../atomic/feedback/rag-alert/rag-alert';
import { RagIcon } from '../../atomic/primitives/rag-icon/rag-icon';
import { Tool } from '../../../types/tool.types';
import { ToolsStore, ToolTestRequest, ToolTestResult } from '../../../store/tools.store';

interface ToolTestDialogData {
  tool: Tool;
}

/**
 * Tool Testing Interface Component
 *
 * Provides real-time tool execution and validation interface.
 * Follows established conventions from DEVELOPMENT_CONVENTIONS.md.
 */
@Component({
  selector: 'tool-testing-interface',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RagDialog,
    RagFormField,
    RagTextarea,
    RagButton,
    RagCard,
    RagChip,
    RagCodeBlock,
    RagAlert,
    RagIcon
  ],
  templateUrl: './tool-testing-interface.html',
  styleUrl: './tool-testing-interface.scss'
})
export class ToolTestingInterface implements OnInit, OnDestroy {
  private readonly dialogRef = inject(DialogRef, { optional: true });
  private readonly data = inject(DIALOG_DATA, { optional: true }) as ToolTestDialogData | null;
  private readonly fb = inject(FormBuilder);
  readonly toolsStore = inject(ToolsStore);

  // Component state
  readonly tool = signal<Tool | null>(this.data?.tool || null);
  readonly isExecuting = signal(false);
  readonly currentTestResult = signal<ToolTestResult | null>(null);
  readonly testHistory = signal<ToolTestResult[]>([]);

  // Icon constants
  readonly PlayIcon = Play;
  readonly SquareIcon = Square;
  readonly ClockIcon = Clock;
  readonly CheckCircleIcon = CheckCircle;
  readonly AlertCircleIcon = AlertCircle;
  readonly LoaderIcon = Loader;
  readonly FileTextIcon = FileText;
  readonly CopyIcon = Copy;
  readonly DownloadIcon = Download;
  readonly SettingsIcon = Settings;

  // Test form
  readonly testForm: FormGroup = this.fb.group({
    testQuery: ['', [Validators.required, Validators.minLength(3)]],
    customParams: ['{}', [this.validJsonValidator]]
  });

  // Computed values
  readonly canExecuteTest = computed(() => {
    const tool = this.tool();
    return tool &&
           tool.status === 'ACTIVE' &&
           this.testForm.valid &&
           !this.isExecuting() &&
           this.toolsStore.isServerRunning();
  });

  readonly testResultVariant = computed(() => {
    const result = this.currentTestResult();
    if (!result) return 'info';
    return result.success ? 'success' : 'error';
  });

  readonly executionStatus = computed(() => {
    if (this.isExecuting()) return 'running';
    const result = this.currentTestResult();
    if (!result) return 'idle';
    return result.success ? 'success' : 'error';
  });

  // Predefined test queries based on tool type
  readonly sampleQueries = computed(() => {
    const tool = this.tool();
    if (!tool) return [];

    const baseQueries = [
      'What is the main purpose of this documentation?',
      'How do I get started with the basics?',
      'What are the key concepts I should understand?',
      'Show me examples of common use cases',
      'What are the best practices and recommendations?'
    ];

    if (tool.baseOperation === 'rag.search') {
      return [
        ...baseQueries,
        'Find information about installation and setup',
        'Search for troubleshooting and common issues',
        'Look for API reference and documentation'
      ];
    } else if (tool.baseOperation === 'rag.answer') {
      return [
        ...baseQueries,
        'Explain the core concepts in simple terms',
        'Provide a comprehensive overview with examples',
        'Generate a tutorial for beginners'
      ];
    }

    return baseQueries;
  });

  ngOnInit() {
    this.loadTestHistory();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  // Custom validator for JSON parameters
  validJsonValidator(control: any) {
    try {
      if (control.value && control.value.trim()) {
        JSON.parse(control.value);
      }
      return null;
    } catch (error) {
      return { invalidJson: true };
    }
  }

  // Load test history for the current tool
  private loadTestHistory() {
    const tool = this.tool();
    if (tool) {
      const history = this.toolsStore.getTestResults(tool.id);
      this.testHistory.set(history);
    }
  }

  // Use sample query
  useSampleQuery(query: string) {
    this.testForm.patchValue({ testQuery: query });
  }

  // Execute tool test
  async executeTest() {
    if (!this.canExecuteTest()) return;

    const tool = this.tool();
    if (!tool) return;

    this.isExecuting.set(true);
    this.currentTestResult.set(null);

    try {
      // Parse custom parameters
      let testParams: Record<string, any> | undefined;
      const customParamsValue = this.testForm.get('customParams')?.value;

      if (customParamsValue && customParamsValue.trim() && customParamsValue !== '{}') {
        try {
          testParams = JSON.parse(customParamsValue);
        } catch (error) {
          throw new Error('Invalid JSON in custom parameters');
        }
      }

      // Create test request
      const testRequest: ToolTestRequest = {
        toolId: tool.id,
        testQuery: this.testForm.get('testQuery')?.value,
        testParams
      };

      // Execute test via store
      const result = await this.toolsStore.testTool(testRequest);

      // Update current result
      this.currentTestResult.set(result);

      // Reload test history to include new result
      this.loadTestHistory();

    } catch (error) {
      const errorResult: ToolTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };

      this.currentTestResult.set(errorResult);
    } finally {
      this.isExecuting.set(false);
    }
  }

  // Stop test execution (placeholder for future implementation)
  stopTest() {
    // In a real implementation, this would cancel the ongoing request
    this.isExecuting.set(false);
  }

  // Copy result to clipboard
  async copyResult() {
    const result = this.currentTestResult();
    if (!result) return;

    try {
      const resultText = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(resultText);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  // Export test results
  exportResults() {
    const tool = this.tool();
    const history = this.testHistory();

    if (!tool || history.length === 0) return;

    const exportData = {
      tool: {
        id: tool.id,
        name: tool.name,
        endpoint: tool.endpoint
      },
      testResults: history,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${tool.name.replace(/\s+/g, '-')}-test-results.json`;
    link.click();

    URL.revokeObjectURL(link.href);
  }

  // Clear test history
  clearHistory() {
    this.testHistory.set([]);
    this.currentTestResult.set(null);
  }

  // Close dialog
  close() {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }

  // Format timestamp for display
  formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }

  // Format latency for display
  formatLatency(latency?: number): string {
    if (!latency) return 'N/A';
    return `${latency.toFixed(0)}ms`;
  }

  // Get result preview for display
  getResultPreview(result: ToolTestResult): string {
    if (!result.success) {
      return result.error || 'Unknown error';
    }

    if (result.response) {
      // Try to extract meaningful content from response
      if (typeof result.response === 'string') {
        return result.response.substring(0, 100) + (result.response.length > 100 ? '...' : '');
      } else if (result.response.results && Array.isArray(result.response.results)) {
        const firstResult = result.response.results[0];
        if (firstResult && firstResult.content) {
          const content = firstResult.content.substring(0, 100);
          return content + (firstResult.content.length > 100 ? '...' : '');
        }
      }

      return JSON.stringify(result.response).substring(0, 100) + '...';
    }

    return 'Success (no response data)';
  }
}