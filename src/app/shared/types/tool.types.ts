export interface Tool {
  id: string;
  name: string;
  endpoint: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
  baseOperation: 'rag.search' | 'rag.answer';
  knowledgeBase: {
    name: string;
    version: string;
  };
  config: {
    topK: number;
    topN: number;
  };
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  errorMessage?: string;
  usage?: {
    totalCalls: number;
    avgLatency: number;
  };
}

export interface ToolBinding {
  toolId: string;
  baseOp: 'rag.search' | 'rag.answer';
  defaults: Record<string, any>;
  constraints: Record<string, any>;
}

export type ToolStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'PENDING';
export type BaseOperation = 'rag.search' | 'rag.answer';

// Phase 4.3: Import/Export & Template Types
export interface RagPackExportResult {
  toolId: string;
  toolName: string;
  ragpackContent: number[]; // Vec<u8> from Rust
  fileSize: number;
  checksum: string;
  dependencies: ToolDependency[];
  format: 'json' | 'yaml';
  exportedAt: string;
  exportMetadata: RagPackMetadata;
}

export interface RagPackMetadata {
  version: string;
  toolVersion: string;
  compatibility: string[];
  description: string;
  tags: string[];
}

export interface ToolDependency {
  name: string;
  dependencyType: 'knowledge_base' | 'service' | 'model';
  version: string;
  required: boolean;
  description: string;
}

export interface ImportToolRequest {
  ragpackContent: number[]; // Vec<u8> from Rust
  validateDependencies?: boolean;
  resolveDependencies?: boolean;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingDependencies: ToolDependency[];
  conflictingTools: string[];
}

export interface BulkExportRequest {
  toolIds: string[];
  format: 'json' | 'yaml';
  includeDependencies: boolean;
}

export interface BulkExportResult {
  ragpackContent: number[]; // Vec<u8> from Rust
  fileSize: number;
  checksum: string;
  exportedTools: string[];
  exportedAt: string;
}

// Template Management Types
export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  baseOperation: BaseOperation;
  tags: string[];
  isBuiltIn: boolean;
  configTemplate: {
    topK: number;
    topN: number;
  };
  defaultPermissions: string[];
  requiredDependencies: ToolDependency[];
  createdAt: string;
}

export interface ToolTemplateLibrary {
  templates: ToolTemplate[];
  categories: string[];
  totalCount: number;
}