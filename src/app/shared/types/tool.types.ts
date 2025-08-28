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