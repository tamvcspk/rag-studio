import { Injectable, signal } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  KnowledgeBase, 
  KnowledgeBaseStats, 
  IndexingProgress, 
  KnowledgeBaseCreateRequest,
  KnowledgeBaseStatus
} from '../types';

@Injectable({
  providedIn: 'root'
})
export class MockKnowledgeBasesService {
  private knowledgeBases = signal<KnowledgeBase[]>([
    {
      id: 'kb-1',
      name: 'Angular Documentation',
      version: '14.2.0',
      product: 'angular',
      description: 'Official Angular framework documentation and guides',
      status: 'indexed',
      contentSource: 'web-documentation',
      sourceUrl: 'https://angular.io/docs',
      size: '45.2 MB',
      chunks: 12845,
      vectors: 12845,
      bm25Terms: 89234,
      documentsCount: 245,
      embeddingModel: 'all-MiniLM-L6-v2',
      semverRange: '^14.2.0',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-15T12:45:00Z'),
      lastIndexedAt: new Date('2024-01-15T12:45:00Z'),
      manifest: {
        version: '1.0.0',
        description: 'Angular framework documentation',
        author: 'Angular Team',
        license: 'MIT'
      },
      fingerprint: 'sha256:abc123def456',
      license: 'MIT'
    },
    {
      id: 'kb-2',
      name: 'Research Papers',
      version: '2024.1',
      product: 'papers',
      description: 'Collection of academic research papers on AI and machine learning',
      status: 'indexing',
      contentSource: 'pdf-collection',
      size: '128.7 MB',
      chunks: 5234,
      vectors: 5234,
      bm25Terms: 45123,
      documentsCount: 42,
      embeddingModel: 'e5-large-v2',
      semverRange: '~2024.1.0',
      createdAt: new Date('2024-01-16T08:00:00Z'),
      updatedAt: new Date('2024-01-16T09:15:00Z'),
      progressPercentage: 65,
      estimatedTimeRemaining: '~5 min',
      manifest: {
        version: '1.0.0',
        description: 'AI/ML research paper collection',
        author: 'Research Team',
        license: 'CC BY 4.0'
      },
      fingerprint: 'sha256:def456ghi789',
      license: 'CC BY 4.0'
    },
    {
      id: 'kb-3',
      name: 'React Documentation',
      version: '18.2.0',
      product: 'react',
      description: 'Official React library documentation and tutorials',
      status: 'indexed',
      contentSource: 'github-repository',
      sourceUrl: 'https://github.com/reactjs/reactjs.org',
      size: '32.1 MB',
      chunks: 8934,
      vectors: 8934,
      bm25Terms: 56789,
      documentsCount: 156,
      embeddingModel: 'all-mpnet-base-v2',
      semverRange: '^18.0.0',
      createdAt: new Date('2024-01-14T14:20:00Z'),
      updatedAt: new Date('2024-01-14T15:30:00Z'),
      lastIndexedAt: new Date('2024-01-14T15:30:00Z'),
      manifest: {
        version: '1.0.0',
        description: 'React library documentation',
        author: 'React Team',
        license: 'MIT'
      },
      fingerprint: 'sha256:ghi789jkl012',
      license: 'MIT'
    },
    {
      id: 'kb-4',
      name: 'Python Standard Library',
      version: '3.11',
      product: 'python',
      description: 'Python standard library reference documentation',
      status: 'failed',
      contentSource: 'web-documentation',
      sourceUrl: 'https://docs.python.org/3/',
      size: '0 MB',
      chunks: 0,
      vectors: 0,
      bm25Terms: 0,
      documentsCount: 0,
      embeddingModel: 'all-MiniLM-L6-v2',
      semverRange: '^3.11.0',
      createdAt: new Date('2024-01-17T11:00:00Z'),
      updatedAt: new Date('2024-01-17T11:30:00Z'),
      manifest: {
        version: '1.0.0',
        description: 'Python standard library documentation',
        author: 'Python Software Foundation',
        license: 'PSF'
      },
      fingerprint: 'sha256:jkl012mno345',
      license: 'PSF'
    }
  ]);

  getKnowledgeBases(): Observable<KnowledgeBase[]> {
    return of(this.knowledgeBases()).pipe(delay(300));
  }

  getKnowledgeBaseById(id: string): Observable<KnowledgeBase | undefined> {
    const kb = this.knowledgeBases().find(kb => kb.id === id);
    return of(kb).pipe(delay(200));
  }

  getKnowledgeBaseStats(): Observable<KnowledgeBaseStats> {
    const kbs = this.knowledgeBases();
    const stats: KnowledgeBaseStats = {
      totalBases: kbs.length,
      totalSize: this.calculateTotalSize(kbs),
      totalChunks: kbs.reduce((sum, kb) => sum + kb.chunks, 0),
      indexedCount: kbs.filter(kb => kb.status === 'indexed').length,
      indexingCount: kbs.filter(kb => kb.status === 'indexing').length,
      failedCount: kbs.filter(kb => kb.status === 'failed').length
    };
    return of(stats).pipe(delay(100));
  }

  getIndexingProgress(): Observable<IndexingProgress[]> {
    const indexingKBs = this.knowledgeBases().filter(kb => kb.status === 'indexing');
    const progress: IndexingProgress[] = indexingKBs.map(kb => ({
      kbId: kb.id,
      percentage: kb.progressPercentage || 0,
      currentStep: 'Embedding documents',
      processedChunks: kb.chunks,
      totalChunks: Math.round(kb.chunks / (kb.progressPercentage || 1) * 100),
      estimatedTimeRemaining: kb.estimatedTimeRemaining || 'Unknown',
      startedAt: kb.updatedAt
    }));
    return of(progress).pipe(delay(150));
  }

  createKnowledgeBase(request: KnowledgeBaseCreateRequest): Observable<KnowledgeBase> {
    const newKB: KnowledgeBase = {
      id: `kb-${Date.now()}`,
      name: request.name,
      version: request.version,
      product: request.product,
      description: request.description,
      status: 'pending',
      contentSource: request.contentSource,
      sourceUrl: request.sourceUrl,
      size: '0 MB',
      chunks: 0,
      vectors: 0,
      bm25Terms: 0,
      documentsCount: 0,
      embeddingModel: request.embeddingModel,
      semverRange: request.semverRange || `^${request.version}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      manifest: {
        version: '1.0.0',
        description: request.description || '',
        license: 'MIT'
      },
      fingerprint: `sha256:${Math.random().toString(36).substr(2, 12)}`
    };

    // Update the signal
    this.knowledgeBases.update(kbs => [...kbs, newKB]);

    // Simulate starting indexing after a delay
    setTimeout(() => {
      this.updateKnowledgeBaseStatus(newKB.id, 'indexing');
    }, 1000);

    return of(newKB).pipe(delay(300));
  }

  updateKnowledgeBaseStatus(id: string, status: KnowledgeBaseStatus): void {
    this.knowledgeBases.update(kbs => 
      kbs.map(kb => kb.id === id ? { ...kb, status, updatedAt: new Date() } : kb)
    );
  }

  deleteKnowledgeBase(id: string): Observable<void> {
    this.knowledgeBases.update(kbs => kbs.filter(kb => kb.id !== id));
    return of(void 0).pipe(delay(200));
  }

  reindexKnowledgeBase(id: string): Observable<void> {
    this.updateKnowledgeBaseStatus(id, 'indexing');
    // Simulate reindexing completion after delay
    setTimeout(() => {
      this.updateKnowledgeBaseStatus(id, 'indexed');
    }, 5000);
    
    return of(void 0).pipe(delay(300));
  }

  exportKnowledgeBase(id: string): Observable<Blob> {
    // Simulate export process
    const mockData = JSON.stringify({ id, message: 'Mock KB export data' });
    const blob = new Blob([mockData], { type: 'application/json' });
    return of(blob).pipe(delay(1000));
  }

  private calculateTotalSize(kbs: KnowledgeBase[]): string {
    // Simple calculation for demo - in real app would parse and sum actual sizes
    const totalMB = kbs.reduce((sum, kb) => {
      const sizeMatch = kb.size.match(/(\d+\.?\d*)/);
      return sum + (sizeMatch ? parseFloat(sizeMatch[1]) : 0);
    }, 0);
    
    if (totalMB >= 1024) {
      return `${(totalMB / 1024).toFixed(1)} GB`;
    }
    return `${totalMB.toFixed(1)} MB`;
  }
}
