import { TestBed } from '@angular/core/testing';

import { MockKnowledgeBases } from './mock-knowledge-bases';

describe('MockKnowledgeBases', () => {
  let service: MockKnowledgeBases;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockKnowledgeBases);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
