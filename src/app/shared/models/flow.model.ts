export interface Flow {
  id: string;
  name: string;
  description: string;
  parts: FlowPart[];
  checksum: string;
  createdAt: string;
  updatedAt: string;
  status: FlowStatus;
  lastExecutedAt?: string;
  executionCount: number;
  avgExecutionTime?: number;
  successRate: number;
  tags: string[];
}

export interface FlowPart {
  id: string;
  kind: 'tool' | 'kb' | 'pipeline';
  refId: string;
  name: string;
  order: number;
  config?: Record<string, any>;
  connections: string[]; // IDs of connected parts
}

export type FlowStatus = 'draft' | 'active' | 'paused' | 'error' | 'archived';

export interface FlowExecution {
  id: string;
  flowId: string;
  startedAt: string;
  endedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  duration?: number;
  stepResults: FlowStepResult[];
  errorMessage?: string;
}

export interface FlowStepResult {
  partId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  output?: any;
  errorMessage?: string;
}