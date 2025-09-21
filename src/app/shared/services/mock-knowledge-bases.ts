// DISABLED - REPLACED BY REAL TAURI SERVICE IN PHASE 3.1
// This mock service is temporarily disabled to avoid type conflicts
// The real KnowledgeBasesService now handles all KB operations via Tauri commands

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { KnowledgeBase } from '../types';

@Injectable({
  providedIn: 'root'
})
export class MockKnowledgeBasesService {
  // DISABLED: All methods now return empty data or throw deprecation notices

  getKnowledgeBases(): Observable<KnowledgeBase[]> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    return of([]);
  }

  createKnowledgeBase(request: any): Observable<KnowledgeBase> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    throw new Error('MockKnowledgeBasesService is deprecated');
  }

  deleteKnowledgeBase(id: string): Observable<void> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    return of(undefined);
  }

  exportKnowledgeBase(id: string): Observable<Blob> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    return of(new Blob());
  }

  reindexKnowledgeBase(id: string): Observable<void> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    return of(undefined);
  }

  getKnowledgeBaseStats(): Observable<any> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    return of({});
  }

  getIndexingProgress(): Observable<any[]> {
    console.warn('MockKnowledgeBasesService is deprecated. Use KnowledgeBasesService instead.');
    return of([]);
  }
}