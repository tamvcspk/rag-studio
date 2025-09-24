export interface Pipeline {
  id: string;
  name: string;
  description: string;
  spec: PipelineSpec;
  templates?: PipelineTemplate[];
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  status: PipelineStatus;
  tags: string[];
  metadata: Record<string, any>;
}

export interface PipelineSpec {
  version: string;
  steps: PipelineStep[];
  parameters: Record<string, PipelineParameter>;
  resources?: PipelineResources;
  triggers?: PipelineTrigger[];
}

export interface PipelineStep {
  id: string;
  name: string;
  type: ETLStepType;
  config: Record<string, any>;
  inputs: PipelineStepInput[];
  outputs: PipelineStepOutput[];
  dependencies: string[]; // IDs of steps this step depends on
  retryPolicy?: RetryPolicy;
  timeout?: number; // seconds
  parallelizable: boolean;
}

export type ETLStepType =
  | 'fetch'
  | 'parse'
  | 'normalize'
  | 'chunk'
  | 'annotate'
  | 'embed'
  | 'index'
  | 'eval'
  | 'pack'
  | 'transform'
  | 'validate';

export interface PipelineStepInput {
  name: string;
  type: 'file' | 'data' | 'config' | 'reference';
  required: boolean;
  source?: string; // Reference to output of another step
  defaultValue?: any;
}

export interface PipelineStepOutput {
  name: string;
  type: 'file' | 'data' | 'config' | 'reference';
  description: string;
}

export interface PipelineParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  customValidator?: string;
}

export interface PipelineResources {
  cpu?: number;
  memory?: number; // MB
  disk?: number; // MB
  timeout?: number; // seconds
  maxParallelSteps?: number;
}

export interface PipelineTrigger {
  type: 'manual' | 'scheduled' | 'file_watch' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  backoffMultiplier: number;
  maxDelay: number; // milliseconds
}

export type PipelineStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: PipelineTemplateCategory;
  spec: PipelineSpec;
  author: string;
  version: string;
  tags: string[];
}

export type PipelineTemplateCategory =
  | 'data_ingestion'
  | 'text_processing'
  | 'document_parsing'
  | 'embedding_generation'
  | 'index_building'
  | 'evaluation'
  | 'export_import'
  | 'custom';

// Pipeline Execution Models
export interface PipelineRun {
  id: string;
  pipelineId: string;
  startedAt: string;
  endedAt?: string;
  status: PipelineRunStatus;
  logsRef?: string;
  artifactsRef?: string;
  metrics: PipelineRunMetrics;
  stepRuns: PipelineStepRun[];
  triggeredBy: RunTrigger;
  parameters: Record<string, any>;
  errorMessage?: string;
  warnings: string[];
}

export type PipelineRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export interface PipelineRunMetrics {
  duration?: number; // milliseconds
  stepsCompleted: number;
  stepsTotal: number;
  stepsSkipped: number;
  stepsFailed: number;
  dataProcessed?: number; // bytes
  recordsProcessed?: number;
  memoryUsed?: number; // MB
  cpuUsed?: number; // percentage
}

export interface PipelineStepRun {
  id: string;
  stepId: string;
  startedAt: string;
  endedAt?: string;
  status: PipelineRunStatus;
  duration?: number; // milliseconds
  output?: any;
  errorMessage?: string;
  retryCount: number;
  metrics: StepRunMetrics;
}

export interface StepRunMetrics {
  inputSize?: number; // bytes
  outputSize?: number; // bytes
  recordsProcessed?: number;
  memoryUsed?: number; // MB
  cpuUsed?: number; // percentage
}

export interface RunTrigger {
  type: 'manual' | 'scheduled' | 'file_watch' | 'webhook' | 'api';
  userId?: string;
  source?: string;
  timestamp: string;
}

// Pipeline Designer specific models
export interface PipelineDesignerNode {
  id: string;
  stepId: string;
  type: ETLStepType;
  name: string;
  position: { x: number; y: number };
  config: Record<string, any>;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  inputs: NodePort[];
  outputs: NodePort[];
}

export interface NodePort {
  id: string;
  name: string;
  type: 'file' | 'data' | 'config' | 'reference';
  connected: boolean;
  connectionId?: string;
}

export interface PipelineConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  dataType: string;
}

export interface PipelineValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'missing_connection' | 'circular_dependency' | 'invalid_config' | 'resource_conflict';
  nodeId?: string;
  message: string;
  suggestions?: string[];
}

export interface ValidationWarning {
  type: 'performance' | 'compatibility' | 'best_practice';
  nodeId?: string;
  message: string;
  level: 'low' | 'medium' | 'high';
}