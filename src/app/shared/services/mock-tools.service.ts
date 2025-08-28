import { Injectable, signal } from '@angular/core';
import { Tool } from '../types/tool.types';

@Injectable({
  providedIn: 'root'
})
export class MockToolsService {
  private readonly toolsSignal = signal<Tool[]>(this.generateMockTools());
  
  readonly tools = this.toolsSignal.asReadonly();
  
  private generateMockTools(): Tool[] {
    return [
      {
        id: '1',
        name: 'Angular Documentation Search',
        endpoint: 'tool.angular.search',
        description: 'Search through Angular framework documentation and guides',
        status: 'ACTIVE',
        baseOperation: 'rag.search',
        knowledgeBase: {
          name: 'angular',
          version: '14.2.0'
        },
        config: {
          topK: 100,
          topN: 8
        },
        permissions: ['rag.search'],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        lastUsed: '2 hours ago',
        usage: {
          totalCalls: 1247,
          avgLatency: 124
        }
      },
      {
        id: '2',
        name: 'React Docs Assistant',
        endpoint: 'tool.react.answer',
        description: 'Answer questions about React with citations from official docs',
        status: 'ACTIVE',
        baseOperation: 'rag.answer',
        knowledgeBase: {
          name: 'react',
          version: '18.2.0'
        },
        config: {
          topK: 100,
          topN: 8
        },
        permissions: ['rag.answer'],
        createdAt: '2024-01-14T14:20:00Z',
        updatedAt: '2024-01-14T14:20:00Z',
        lastUsed: '5 minutes ago',
        usage: {
          totalCalls: 892,
          avgLatency: 187
        }
      },
      {
        id: '3',
        name: 'Python API Documentation',
        endpoint: 'tool.python.search',
        description: 'Search Python standard library and framework documentation',
        status: 'ERROR',
        baseOperation: 'rag.search',
        knowledgeBase: {
          name: 'python',
          version: '3.11'
        },
        config: {
          topK: 150,
          topN: 10
        },
        permissions: ['rag.search'],
        createdAt: '2024-01-13T09:15:00Z',
        updatedAt: '2024-01-13T09:15:00Z',
        errorMessage: 'Knowledge base \"python@3.11\" not found'
      },
      {
        id: '4',
        name: 'Vue.js Guide Search',
        endpoint: 'tool.vue.search',
        description: 'Search through Vue.js official guides and API documentation',
        status: 'INACTIVE',
        baseOperation: 'rag.search',
        knowledgeBase: {
          name: 'vue',
          version: '3.3.0'
        },
        config: {
          topK: 80,
          topN: 6
        },
        permissions: ['rag.search'],
        createdAt: '2024-01-12T16:45:00Z',
        updatedAt: '2024-01-12T16:45:00Z',
        lastUsed: '1 day ago',
        usage: {
          totalCalls: 234,
          avgLatency: 98
        }
      },
      {
        id: '5',
        name: 'TypeScript Documentation',
        endpoint: 'tool.typescript.answer',
        description: 'Answer TypeScript questions with official documentation references',
        status: 'ACTIVE',
        baseOperation: 'rag.answer',
        knowledgeBase: {
          name: 'typescript',
          version: '5.0'
        },
        config: {
          topK: 120,
          topN: 8
        },
        permissions: ['rag.answer'],
        createdAt: '2024-01-11T11:30:00Z',
        updatedAt: '2024-01-11T11:30:00Z',
        lastUsed: '30 minutes ago',
        usage: {
          totalCalls: 567,
          avgLatency: 156
        }
      },
      {
        id: '6',
        name: 'Rust Programming Guide',
        endpoint: 'tool.rust.search',
        description: 'Search Rust programming language documentation and The Book',
        status: 'PENDING',
        baseOperation: 'rag.search',
        knowledgeBase: {
          name: 'rust',
          version: '1.75'
        },
        config: {
          topK: 100,
          topN: 8
        },
        permissions: ['rag.search'],
        createdAt: '2024-01-16T08:15:00Z',
        updatedAt: '2024-01-16T08:15:00Z'
      }
    ];
  }

  // Mock service methods
  createTool(toolData: any): Promise<Tool> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newTool: Tool = {
          id: Date.now().toString(),
          name: toolData.name,
          endpoint: toolData.endpoint,
          description: toolData.description,
          status: 'ACTIVE',
          baseOperation: toolData.baseOperation,
          knowledgeBase: this.findKnowledgeBase(toolData.knowledgeBaseId),
          config: {
            topK: toolData.topK,
            topN: toolData.topN
          },
          permissions: [toolData.baseOperation],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.toolsSignal.update(tools => [...tools, newTool]);
        resolve(newTool);
      }, 1000);
    });
  }

  updateToolStatus(toolId: string, status: Tool['status']): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.toolsSignal.update(tools => 
          tools.map(tool => 
            tool.id === toolId 
              ? { ...tool, status, updatedAt: new Date().toISOString() }
              : tool
          )
        );
        resolve();
      }, 500);
    });
  }

  deleteTool(toolId: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.toolsSignal.update(tools => tools.filter(tool => tool.id !== toolId));
        resolve();
      }, 500);
    });
  }

  retryToolRegistration(toolId: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.toolsSignal.update(tools => 
          tools.map(tool => 
            tool.id === toolId 
              ? { 
                  ...tool, 
                  status: 'ACTIVE', 
                  errorMessage: undefined,
                  updatedAt: new Date().toISOString() 
                }
              : tool
          )
        );
        resolve();
      }, 1500);
    });
  }

  private findKnowledgeBase(kbId: string) {
    const kbMap: Record<string, { name: string; version: string }> = {
      '1': { name: 'angular', version: '14.2.0' },
      '2': { name: 'react', version: '18.2.0' },
      '3': { name: 'vue', version: '3.3.0' },
      '4': { name: 'python', version: '3.11' }
    };
    
    return kbMap[kbId] || { name: 'unknown', version: '1.0.0' };
  }

  // Statistics
  getToolStats() {
    const tools = this.toolsSignal();
    return {
      total: tools.length,
      active: tools.filter(t => t.status === 'ACTIVE').length,
      inactive: tools.filter(t => t.status === 'INACTIVE').length,
      error: tools.filter(t => t.status === 'ERROR').length,
      pending: tools.filter(t => t.status === 'PENDING').length
    };
  }
}