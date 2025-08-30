import { Injectable, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Flow, FlowExecution } from '../models/flow.model';

@Injectable({
  providedIn: 'root'
})
export class FlowsService {
  private flows = signal<Flow[]>([
    {
      id: 'flow-1',
      name: 'Documentation Assistant Flow',
      description: 'Complete flow for answering questions about Angular and React documentation with comprehensive search and analysis.',
      parts: [
        {
          id: 'part-tool-1',
          kind: 'tool',
          refId: 'tool-angular-search',
          name: 'Angular Search',
          order: 0,
          connections: ['part-kb-1']
        },
        {
          id: 'part-kb-1',
          kind: 'kb',
          refId: 'kb-angular-docs',
          name: 'Angular Docs v14',
          order: 1,
          connections: ['part-tool-2']
        },
        {
          id: 'part-tool-2',
          kind: 'tool',
          refId: 'tool-react-assistant',
          name: 'React Assistant',
          order: 2,
          connections: []
        }
      ],
      checksum: 'abc123def456',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-20T14:45:00Z',
      status: 'active',
      lastExecutedAt: '2024-01-20T09:15:00Z',
      executionCount: 127,
      avgExecutionTime: 2340,
      successRate: 0.956,
      tags: ['documentation', 'assistant', 'frontend']
    },
    {
      id: 'flow-2',
      name: 'Content Ingestion Pipeline',
      description: 'Automated flow for ingesting and processing documentation from multiple sources with intelligent chunking and indexing.',
      parts: [
        {
          id: 'part-pipeline-1',
          kind: 'pipeline',
          refId: 'pipeline-doc-sync',
          name: 'Doc Sync Pipeline',
          order: 0,
          connections: ['part-kb-2']
        },
        {
          id: 'part-kb-2',
          kind: 'kb',
          refId: 'kb-react-docs',
          name: 'React Docs v18',
          order: 1,
          connections: []
        }
      ],
      checksum: 'def456ghi789',
      createdAt: '2024-01-10T08:20:00Z',
      updatedAt: '2024-01-18T16:30:00Z',
      status: 'paused',
      lastExecutedAt: '2024-01-18T12:00:00Z',
      executionCount: 45,
      avgExecutionTime: 8750,
      successRate: 0.978,
      tags: ['ingestion', 'automation', 'pipeline']
    },
    {
      id: 'flow-3',
      name: 'Multi-Source Research Flow',
      description: 'Advanced research flow combining multiple knowledge bases and tools for comprehensive technical analysis and recommendations.',
      parts: [
        {
          id: 'part-kb-3',
          kind: 'kb',
          refId: 'kb-research-papers',
          name: 'Research Papers',
          order: 0,
          connections: ['part-pipeline-2']
        },
        {
          id: 'part-pipeline-2',
          kind: 'pipeline',
          refId: 'pipeline-content-ingestion',
          name: 'Content Ingestion',
          order: 1,
          connections: ['part-tool-3']
        },
        {
          id: 'part-tool-3',
          kind: 'tool',
          refId: 'tool-research-assistant',
          name: 'Research Assistant',
          order: 2,
          connections: []
        }
      ],
      checksum: 'ghi789jkl012',
      createdAt: '2024-01-05T14:15:00Z',
      updatedAt: '2024-01-22T11:20:00Z',
      status: 'draft',
      executionCount: 0,
      successRate: 1.0,
      tags: ['research', 'analysis', 'multi-source']
    },
    {
      id: 'flow-4',
      name: 'Error Recovery Flow',
      description: 'Testing flow with error conditions to demonstrate error handling and recovery mechanisms.',
      parts: [
        {
          id: 'part-tool-4',
          kind: 'tool',
          refId: 'tool-broken',
          name: 'Broken Tool',
          order: 0,
          connections: []
        }
      ],
      checksum: 'error123test',
      createdAt: '2024-01-25T09:00:00Z',
      updatedAt: '2024-01-25T09:00:00Z',
      status: 'error',
      lastExecutedAt: '2024-01-25T10:30:00Z',
      executionCount: 3,
      successRate: 0.0,
      tags: ['testing', 'error-handling']
    }
  ]);

  private executions = signal<FlowExecution[]>([
    {
      id: 'exec-1',
      flowId: 'flow-1',
      startedAt: '2024-01-20T09:15:00Z',
      endedAt: '2024-01-20T09:15:02Z',
      status: 'completed',
      duration: 2340,
      stepResults: [
        {
          partId: 'part-tool-1',
          status: 'completed',
          startedAt: '2024-01-20T09:15:00Z',
          endedAt: '2024-01-20T09:15:01Z',
          duration: 1200
        },
        {
          partId: 'part-kb-1',
          status: 'completed',
          startedAt: '2024-01-20T09:15:01Z',
          endedAt: '2024-01-20T09:15:02Z',
          duration: 1140
        }
      ]
    }
  ]);

  // Read operations
  getAllFlows(): Observable<Flow[]> {
    return of(this.flows()).pipe(delay(300));
  }

  getFlowById(id: string): Observable<Flow | null> {
    const flow = this.flows().find(f => f.id === id) || null;
    return of(flow).pipe(delay(200));
  }

  getFlowsByStatus(status: Flow['status']): Observable<Flow[]> {
    const filtered = this.flows().filter(f => f.status === status);
    return of(filtered).pipe(delay(250));
  }

  getFlowExecutions(flowId: string): Observable<FlowExecution[]> {
    const executions = this.executions().filter(e => e.flowId === flowId);
    return of(executions).pipe(delay(200));
  }

  // Write operations
  createFlow(flow: Omit<Flow, 'id' | 'createdAt' | 'updatedAt'>): Observable<Flow> {
    const newFlow: Flow = {
      ...flow,
      id: `flow-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.flows.update(flows => [...flows, newFlow]);
    return of(newFlow).pipe(delay(500));
  }

  updateFlow(id: string, updates: Partial<Flow>): Observable<Flow | null> {
    const flows = this.flows();
    const index = flows.findIndex(f => f.id === id);
    
    if (index === -1) {
      return of(null).pipe(delay(200));
    }

    const updatedFlow: Flow = {
      ...flows[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.flows.update(flows => {
      const newFlows = [...flows];
      newFlows[index] = updatedFlow;
      return newFlows;
    });

    return of(updatedFlow).pipe(delay(400));
  }

  deleteFlow(id: string): Observable<boolean> {
    const flows = this.flows();
    const exists = flows.some(f => f.id === id);
    
    if (exists) {
      this.flows.update(flows => flows.filter(f => f.id !== id));
    }

    return of(exists).pipe(delay(300));
  }

  // Execution operations
  executeFlow(id: string): Observable<FlowExecution> {
    const flow = this.flows().find(f => f.id === id);
    if (!flow) {
      throw new Error(`Flow with id ${id} not found`);
    }

    const execution: FlowExecution = {
      id: `exec-${Date.now()}`,
      flowId: id,
      startedAt: new Date().toISOString(),
      status: 'running',
      stepResults: flow.parts.map(part => ({
        partId: part.id,
        status: 'pending',
        startedAt: new Date().toISOString()
      }))
    };

    this.executions.update(executions => [...executions, execution]);

    // Simulate execution completion
    setTimeout(() => {
      const completedExecution: FlowExecution = {
        ...execution,
        status: 'completed',
        endedAt: new Date().toISOString(),
        duration: Math.floor(Math.random() * 5000) + 1000,
        stepResults: execution.stepResults.map(step => ({
          ...step,
          status: 'completed',
          endedAt: new Date().toISOString(),
          duration: Math.floor(Math.random() * 2000) + 500
        }))
      };

      this.executions.update(executions => 
        executions.map(e => e.id === execution.id ? completedExecution : e)
      );

      // Update flow execution stats
      this.updateFlow(id, {
        lastExecutedAt: completedExecution.endedAt,
        executionCount: flow.executionCount + 1
      });
    }, 2000);

    return of(execution).pipe(delay(100));
  }

  pauseFlow(id: string): Observable<Flow | null> {
    return this.updateFlow(id, { status: 'paused' });
  }

  resumeFlow(id: string): Observable<Flow | null> {
    return this.updateFlow(id, { status: 'active' });
  }

  duplicateFlow(id: string): Observable<Flow | null> {
    const originalFlow = this.flows().find(f => f.id === id);
    if (!originalFlow) {
      return of(null).pipe(delay(200));
    }

    const duplicatedFlow = {
      ...originalFlow,
      name: `${originalFlow.name} (Copy)`,
      status: 'draft' as const,
      executionCount: 0,
      lastExecutedAt: undefined
    };

    return this.createFlow(duplicatedFlow);
  }

  exportFlow(id: string): Observable<string> {
    const flow = this.flows().find(f => f.id === id);
    if (!flow) {
      throw new Error(`Flow with id ${id} not found`);
    }

    const exportData = JSON.stringify(flow, null, 2);
    return of(exportData).pipe(delay(500));
  }

  importFlow(flowData: string): Observable<Flow> {
    try {
      const parsedFlow = JSON.parse(flowData);
      const flowToImport = {
        ...parsedFlow,
        status: 'draft' as const,
        executionCount: 0,
        lastExecutedAt: undefined
      };
      
      return this.createFlow(flowToImport);
    } catch (error) {
      throw new Error('Invalid flow data format');
    }
  }
}
