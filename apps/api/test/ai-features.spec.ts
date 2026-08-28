import { EmbeddingService } from '../src/ai/embedding.service';
import { AiService } from '../src/ai/ai.service';
import { CacheService } from '../src/common/cache.service';

describe('Phase 17 & Phase 18 — AI Features', () => {
  let embeddingService: EmbeddingService;
  let cacheService: CacheService;
  let aiService: AiService;
  let mockDataSource: any;
  let mockIssueService: any;

  beforeEach(() => {
    embeddingService = new EmbeddingService();
    cacheService = new CacheService();
    mockDataSource = {
      query: jest.fn(),
    };
    mockIssueService = {
      getIssue: jest.fn(),
      searchIssues: jest.fn(),
    };
    aiService = new AiService(mockDataSource as any, embeddingService, cacheService, mockIssueService as any);
  });

  describe('EmbeddingService', () => {
    it('should generate deterministic 1536-dimensional normalized vectors', async () => {
      const text = 'User authentication fails when session cookie expires';
      const vector = await embeddingService.generateEmbedding(text);

      expect(vector).toHaveLength(1536);
      // Verify unit length
      let sumSquares = 0;
      for (const val of vector) {
        sumSquares += val * val;
      }
      expect(Math.sqrt(sumSquares)).toBeCloseTo(1, 4);
    });

    it('should calculate accurate cosine similarity between identical and distinct vectors', async () => {
      const vecA = await embeddingService.generateEmbedding('payment timeout error in checkout');
      const vecB = await embeddingService.generateEmbedding('payment timeout error in checkout');
      const vecC = await embeddingService.generateEmbedding('unrelated aesthetic button background color change');

      const simIdentical = embeddingService.cosineSimilarity(vecA, vecB);
      const simDifferent = embeddingService.cosineSimilarity(vecA, vecC);

      expect(simIdentical).toBeCloseTo(1.0, 4);
      expect(simDifferent).toBeLessThan(simIdentical);
    });
  });

  describe('Phase 17: AI Duplicate Detection', () => {
    it('should identify candidate duplicates and record advisory suggestion', async () => {
      const targetIssueId = 'issue-1';
      const projectId = 'proj-1';
      const vector1 = await embeddingService.generateEmbedding('Database connection pool exhausted during peak spike');
      const vector2 = await embeddingService.generateEmbedding('Database connection pool exhausted during peak spike');

      mockIssueService.getIssue.mockResolvedValueOnce({
        id: targetIssueId,
        organizationId: 'org-1',
        projectId,
        title: 'DB pool exhausted under load',
      });

      // Issue embedding lookup
      mockDataSource.query
        .mockResolvedValueOnce([{ vector: `[${vector1.join(',')}]` }]) // target embedding
        .mockResolvedValueOnce([
          {
            issueId: 'issue-2',
            vector: `[${vector2.join(',')}]`,
            title: 'Database connection pool exhausted during peak spike',
            number: 42,
            projectKey: 'CORE',
            description: 'Same DB error log',
          },
        ]) // project issues embeddings
        .mockResolvedValueOnce([]); // insert ai_suggestions

      const duplicates = await aiService.findDuplicates(projectId, targetIssueId);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].issueKey).toBe('CORE-42');
      expect(duplicates[0].similarity).toBeGreaterThanOrEqual(0.70);
      expect(duplicates[0].status).toBe('PENDING');
      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('Phase 18 & 19: AI Issue Quality, Triage & Summaries', () => {
    it('should audit issue quality and identify missing steps or ambiguity', async () => {
      mockIssueService.getIssue.mockResolvedValueOnce({
        id: 'issue-incomplete',
        organizationId: 'org-1',
        projectId: 'proj-1',
        title: 'bug',
        description: 'it is broken',
        issueTypeCode: 'BUG',
        reproductionSteps: '',
        expectedResult: '',
        actualResult: '',
        environment: null,
      });

      mockDataSource.query.mockResolvedValueOnce([]); // insert ai_suggestions

      const quality = await aiService.qualityCheck('issue-incomplete');

      expect(quality.score).toBeLessThan(50);
      expect(quality.ambiguities).toContain('Issue title is very brief (< 10 characters).');
      expect(quality.missingElements).toContain('reproduction_steps');
      expect(quality.missingElements).toContain('expected_result');
      expect(quality.suggestedQuestions.length).toBeGreaterThan(0);
    });

    it('should classify and suggest triage metadata with confidence and evidence', async () => {
      mockIssueService.getIssue.mockResolvedValueOnce({
        id: 'issue-crash',
        organizationId: 'org-1',
        projectId: 'proj-1',
        title: 'Fatal crash on payment authorization due to security null pointer',
        description: 'Server returns 500 downtime error and memory dump on checkout page',
        reproductionSteps: 'Submit checkout with invalid card',
        componentId: null,
      });

      mockDataSource.query
        .mockResolvedValueOnce([{ id: 'comp-1', name: 'Checkout' }]) // components query
        .mockResolvedValueOnce([]) // suggestRouting members query
        .mockResolvedValueOnce([]); // insert ai_suggestions

      const triage = await aiService.triageIssue('proj-1', 'issue-crash');

      expect(triage.suggestedIssueType?.code).toBe('BUG');
      expect(triage.suggestedPriority?.code).toBe('URGENT');
      expect(triage.suggestedSeverity?.code).toBe('BLOCKER');
      expect(triage.suggestedComponent?.name).toBe('Checkout');
      expect(triage.suggestedLabels?.map(l => l.name)).toContain('security');
    });

    it('should summarize issue with caching', async () => {
      mockIssueService.getIssue.mockResolvedValueOnce({
        id: 'issue-summary-1',
        organizationId: 'org-1',
        projectId: 'proj-1',
        title: 'Payment gateway timeout on checkout',
        description: 'Users experience 504 error',
        statusName: 'In Progress',
        priorityName: 'High',
      });

      mockDataSource.query
        .mockResolvedValueOnce([{ body: 'Investigating database locks', created_at: new Date() }]) // comments
        .mockResolvedValueOnce([]); // insert ai_suggestions

      const summary = await aiService.summarizeIssue('issue-summary-1');

      expect(summary.issueId).toBe('issue-summary-1');
      expect(summary.summary).toContain('ForgeTrack AI Summary');
      expect(summary.cached).toBe(false);

      // Re-fetching should hit cache
      const cachedSummary = await aiService.summarizeIssue('issue-summary-1');
      expect(cachedSummary.cached).toBe(true);
    });

    it('should allow accepting an AI duplicate suggestion to link issues', async () => {
      const suggestionId = 'sug-uuid-1';
      mockDataSource.query
        .mockResolvedValueOnce([
          {
            id: suggestionId,
            orgId: 'org-1',
            projectId: 'proj-1',
            issueId: 'source-issue-1',
            type: 'DUPLICATE',
            result: { topCandidate: { issueId: 'target-issue-2' } },
            status: 'PENDING',
          },
        ]) // select suggestion
        .mockResolvedValueOnce([]) // insert relationship
        .mockResolvedValueOnce([
          { id: suggestionId, type: 'DUPLICATE', status: 'ACCEPTED', confidence: 0.95 },
        ]); // update suggestion

      const accepted = await aiService.acceptSuggestion(suggestionId, 'user-1');

      expect(accepted.status).toBe('ACCEPTED');
      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
    });
  });
});
