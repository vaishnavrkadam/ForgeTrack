import { Injectable, Inject, forwardRef, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { EmbeddingService } from './embedding.service';
import { IssueService } from '../issue/issue.service';
import { CacheService } from '../common/cache.service';
import { SearchIssueDto } from '../issue/dto/search-issue.dto';
import {
  AiDuplicateCandidateDto,
  AiQualityCheckResultDto,
  AiTriageSuggestionDto,
  AiSuggestionRecordDto,
  AiSummaryDto,
} from '@forgetrack/contracts';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => IssueService))
    private readonly issueService: IssueService,
  ) {}

  /**
   * Recalculate issue text embedding and save to database
   */
  async updateIssueEmbedding(issueId: string): Promise<void> {
    const issueRes = await this.dataSource.query(
      `SELECT organization_id as "orgId", project_id as "projectId", title, description FROM issues WHERE id = $1 LIMIT 1`,
      [issueId],
    );
    if (issueRes.length === 0) return;
    const issue = issueRes[0];

    const text = `Title: ${issue.title}\nDescription: ${issue.description || ''}`;
    const contentHash = crypto.createHash('sha256').update(text).digest('hex');
    const model = 'gemini-embedding-004';
    const vector = await this.embeddingService.generateEmbedding(text);

    try {
      // 1. Try pgvector string format first: '[v0, v1, ...]'
      const vectorStr = `[${vector.join(',')}]`;
      await this.dataSource.query(
        `INSERT INTO embeddings (organization_id, project_id, entity_type, entity_id, content_hash, model, vector)
         VALUES ($1, $2, 'ISSUE', $3, $4, $5, $6)
         ON CONFLICT (entity_type, entity_id, model)
         DO UPDATE SET vector = EXCLUDED.vector, content_hash = EXCLUDED.content_hash`,
        [issue.orgId, issue.projectId, issueId, contentHash, model, vectorStr],
      );
    } catch (err) {
      // 2. Fallback to double precision array format: '{v0, v1, ...}' if vector type is float8[]
      const arrayStr = `{${vector.join(',')}}`;
      await this.dataSource.query(
        `INSERT INTO embeddings (organization_id, project_id, entity_type, entity_id, content_hash, model, vector)
         VALUES ($1, $2, 'ISSUE', $3, $4, $5, $6)
         ON CONFLICT (entity_type, entity_id, model)
         DO UPDATE SET vector = EXCLUDED.vector, content_hash = EXCLUDED.content_hash`,
        [issue.orgId, issue.projectId, issueId, contentHash, model, arrayStr],
      );
    }
  }

  /**
   * Search for issues matching semantics of queryText with permission awareness
   */
  async semanticSearch(orgId: string, queryText: string, limit: number = 20, projectIds?: string[]): Promise<any[]> {
    const queryVector = await this.embeddingService.generateEmbedding(queryText);

    // Cache key for frequent identical semantic queries
    const cacheKey = `sem_search:${orgId}:${crypto.createHash('md5').update(queryText).digest('hex')}:${limit}`;
    const cached = this.cacheService.get<any[]>(cacheKey);
    if (cached) return cached;

    let projectFilterClause = '';
    const queryParams: any[] = [`[${queryVector.join(',')}]`, orgId];

    if (projectIds && projectIds.length > 0) {
      queryParams.push(projectIds);
      projectFilterClause = `AND e.project_id = ANY($${queryParams.length})`;
    }
    queryParams.push(limit);

    try {
      // Try Database-level vector distance sorting if pgvector is active
      const hits = await this.dataSource.query(
        `SELECT e.entity_id as "issueId", (e.vector <=> $1::vector) as distance
         FROM embeddings e
         WHERE e.organization_id = $2 AND e.entity_type = 'ISSUE' ${projectFilterClause}
         ORDER BY distance ASC LIMIT $${queryParams.length}`,
        queryParams,
      );

      const results = [];
      for (const hit of hits) {
        try {
          const details = await this.issueService.getIssue(hit.issueId);
          results.push({ ...details, similarity: 1 - Number(hit.distance) });
        } catch {
          // Ignored if deleted
        }
      }
      this.cacheService.set(cacheKey, results, 180); // cache for 3 mins
      return results;
    } catch {
      // Fallback: In-memory cosine similarity calculation
      const fallbackParams: any[] = [orgId];
      let fallbackFilter = '';
      if (projectIds && projectIds.length > 0) {
        fallbackParams.push(projectIds);
        fallbackFilter = `AND e.project_id = ANY($2)`;
      }

      const rows = await this.dataSource.query(
        `SELECT e.entity_id as "issueId", e.vector
         FROM embeddings e
         WHERE e.organization_id = $1 AND e.entity_type = 'ISSUE' ${fallbackFilter}`,
        fallbackParams,
      );

      const matches = [];
      for (const row of rows) {
        try {
          const valStr = String(row.vector).replace(/[{}[\]]/g, '');
          const vec = valStr.split(',').map(Number);

          if (vec.length === queryVector.length) {
            const similarity = this.embeddingService.cosineSimilarity(queryVector, vec);
            matches.push({ issueId: row.issueId, similarity });
          }
        } catch {
          // Format errors
        }
      }

      matches.sort((a, b) => b.similarity - a.similarity);
      const topHits = matches.slice(0, limit);

      const results = [];
      for (const hit of topHits) {
        try {
          const details = await this.issueService.getIssue(hit.issueId);
          results.push({ ...details, similarity: hit.similarity });
        } catch {
          // Ignored if deleted
        }
      }
      this.cacheService.set(cacheKey, results, 180);
      return results;
    }
  }

  /**
   * Hybrid Search: Merges text and semantic searches using Reciprocal Rank Fusion (RRF)
   */
  async hybridSearch(orgId: string, dto: SearchIssueDto): Promise<any[]> {
    const textResults = await this.issueService.searchIssues(orgId, dto);

    let semanticResults: any[] = [];
    if (dto.q) {
      semanticResults = await this.semanticSearch(orgId, dto.q, 50, dto.projectId ? [dto.projectId] : undefined);
    }

    const rrfScores = new Map<string, { item: any; score: number }>();
    const applyRrf = (results: any[], weight: number) => {
      results.forEach((item, index) => {
        const rank = index + 1;
        const current = rrfScores.get(item.id) || { item, score: 0 };
        current.score += weight * (1 / (60 + rank));
        rrfScores.set(item.id, current);
      });
    };

    applyRrf(textResults, 0.4);
    applyRrf(semanticResults, 0.6);

    return Array.from(rrfScores.values())
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);
  }

  // -------------------------------------------------------------
  // Phase 17: AI Duplicate Detection
  // -------------------------------------------------------------

  /**
   * Find potential duplicate issues based on vector similarity threshold (> 0.70)
   * and log suggestion to ai_suggestions table
   */
  async findDuplicates(projectId: string, issueId: string): Promise<AiDuplicateCandidateDto[]> {
    const issue = await this.issueService.getIssue(issueId);

    // Make sure current issue has embedding
    let issueEmbedding = await this.dataSource.query(
      `SELECT vector FROM embeddings WHERE entity_id = $1 AND entity_type = 'ISSUE' LIMIT 1`,
      [issueId],
    );

    if (issueEmbedding.length === 0) {
      await this.updateIssueEmbedding(issueId);
      issueEmbedding = await this.dataSource.query(
        `SELECT vector FROM embeddings WHERE entity_id = $1 AND entity_type = 'ISSUE' LIMIT 1`,
        [issueId],
      );
    }

    if (issueEmbedding.length === 0) return [];

    const valStr = String(issueEmbedding[0].vector).replace(/[{}[\]]/g, '');
    const queryVector = valStr.split(',').map(Number);

    const rows = await this.dataSource.query(
      `SELECT e.entity_id as "issueId", e.vector, i.title, i.number, p.key as "projectKey",
              i.description
       FROM embeddings e
       JOIN issues i ON i.id = e.entity_id
       JOIN projects p ON p.id = i.project_id
       WHERE i.project_id = $1 AND e.entity_id != $2 AND e.entity_type = 'ISSUE'`,
      [projectId, issueId],
    );

    const duplicates: AiDuplicateCandidateDto[] = [];
    for (const row of rows) {
      const rowValStr = String(row.vector).replace(/[{}[\]]/g, '');
      const vec = rowValStr.split(',').map(Number);
      if (vec.length === queryVector.length) {
        const similarity = this.embeddingService.cosineSimilarity(queryVector, vec);
        if (similarity >= 0.70) {
          const reason = this.generateDuplicateReason(issue.title, row.title, similarity);
          duplicates.push({
            issueId: row.issueId,
            issueKey: `${row.projectKey}-${row.number}`,
            title: row.title,
            similarity: parseFloat(similarity.toFixed(4)),
            reason,
            status: 'PENDING',
          });
        }
      }
    }

    duplicates.sort((a, b) => b.similarity - a.similarity);

    // Log advisory suggestion record
    if (duplicates.length > 0) {
      const bestCandidate = duplicates[0];
      const inputHash = crypto.createHash('sha256').update(issueId + bestCandidate.issueId).digest('hex');
      await this.dataSource.query(
        `INSERT INTO ai_suggestions (organization_id, project_id, issue_id, type, model, input_hash, result, confidence, status)
         VALUES ($1, $2, $3, 'DUPLICATE', 'gemini-embedding-004', $4, $5::jsonb, $6, 'PENDING')`,
        [
          issue.organizationId,
          projectId,
          issueId,
          inputHash,
          JSON.stringify({ candidates: duplicates, topCandidate: bestCandidate }),
          bestCandidate.similarity,
        ],
      );
    }

    return duplicates;
  }

  private generateDuplicateReason(targetTitle: string, candidateTitle: string, similarity: number): string {
    const simPercent = Math.round(similarity * 100);
    return `High textual and semantic similarity (${simPercent}%) between "${targetTitle.substring(0, 30)}" and "${candidateTitle.substring(0, 30)}".`;
  }

  // -------------------------------------------------------------
  // Phase 18: AI Issue Quality & Triage Assistant
  // -------------------------------------------------------------

  /**
   * Quality Audit Assistant: Checks completeness of issue description and steps
   */
  async qualityCheck(issueId: string): Promise<AiQualityCheckResultDto> {
    const issue = await this.issueService.getIssue(issueId);

    const missingElements: string[] = [];
    const ambiguities: string[] = [];
    const suggestedQuestions: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const title = (issue.title || '').trim();
    const description = (issue.description || '').trim();
    const reproductionSteps = (issue.reproductionSteps || '').trim();
    const expectedResult = (issue.expectedResult || '').trim();
    const actualResult = (issue.actualResult || '').trim();
    const environment = issue.environment;

    // Check title quality
    if (title.length < 10) {
      ambiguities.push('Issue title is very brief (< 10 characters).');
      score -= 15;
    }
    if (/^(bug|error|problem|issue|broken|help)$/i.test(title)) {
      ambiguities.push('Title contains generic non-descriptive keyword.');
      score -= 15;
    }

    // Check description & reproduction steps
    if (!description || description.length < 30) {
      missingElements.push('detailed_description');
      suggestedQuestions.push('Could you provide more context or background for what was happening?');
      score -= 25;
    }

    if (issue.issueTypeCode === 'BUG' || !issue.issueTypeCode) {
      if (!reproductionSteps && !description.toLowerCase().includes('step')) {
        missingElements.push('reproduction_steps');
        suggestedQuestions.push('What are the exact step-by-step actions to reproduce this issue?');
        recommendations.push('Add a step-by-step reproduction sequence.');
        score -= 20;
      }
      if (!expectedResult && !description.toLowerCase().includes('expect')) {
        missingElements.push('expected_result');
        suggestedQuestions.push('What did you expect to happen instead?');
        score -= 10;
      }
      if (!actualResult && !description.toLowerCase().includes('actual')) {
        missingElements.push('actual_result');
        suggestedQuestions.push('What was the observed behavior or error message?');
        score -= 10;
      }
      if (!environment || Object.keys(environment).length === 0) {
        missingElements.push('environment_details');
        suggestedQuestions.push('Which OS, browser version, or deployment environment was this observed on?');
        recommendations.push('Specify environment details (OS, browser, app version).');
        score -= 10;
      }
    }

    if (score < 0) score = 0;
    if (score >= 85) {
      recommendations.push('Issue contains sufficient details for engineering triage.');
    }

    const result: AiQualityCheckResultDto = {
      score,
      missingElements,
      ambiguities,
      suggestedQuestions,
      recommendations,
    };

    // Log suggestion record
    const inputHash = crypto.createHash('sha256').update(issueId + score.toString()).digest('hex');
    await this.dataSource.query(
      `INSERT INTO ai_suggestions (organization_id, project_id, issue_id, type, model, input_hash, result, confidence, status)
       VALUES ($1, $2, $3, 'QUALITY', 'rule-and-llm-quality-v1', $4, $5::jsonb, $6, 'PENDING')`,
      [issue.organizationId, issue.projectId, issueId, inputHash, JSON.stringify(result), score / 100],
    );

    return result;
  }

  /**
   * Triage Assistant: Suggests type, component, priority, severity, labels, and optimal assignee
   */
  async triageIssue(projectId: string, issueId: string): Promise<AiTriageSuggestionDto> {
    const issue = await this.issueService.getIssue(issueId);
    const content = `${issue.title} ${issue.description || ''} ${issue.reproductionSteps || ''}`.toLowerCase();

    // 1. Suggested Issue Type
    let suggestedIssueType: any = undefined;
    if (content.includes('feature') || content.includes('enhancement') || content.includes('support for') || content.includes('add capability')) {
      suggestedIssueType = { code: 'FEATURE', name: 'Feature Request', confidence: 0.88, evidence: 'Mentions new capability or feature addition.' };
    } else if (content.includes('task') || content.includes('cleanup') || content.includes('refactor') || content.includes('migrate')) {
      suggestedIssueType = { code: 'TASK', name: 'Task', confidence: 0.85, evidence: 'Mentions refactoring, cleanup or migration tasks.' };
    } else if (content.includes('crash') || content.includes('error') || content.includes('broken') || content.includes('fails') || content.includes('exception')) {
      suggestedIssueType = { code: 'BUG', name: 'Bug', confidence: 0.92, evidence: 'Mentions error or system failure behavior.' };
    }

    // 2. Suggested Priority and Severity
    let suggestedPriority: any = { code: 'MEDIUM', confidence: 0.70, evidence: 'Standard default priority assessment.' };
    let suggestedSeverity: any = { code: 'MAJOR', confidence: 0.70, evidence: 'Standard non-blocking defect severity.' };

    if (content.includes('crash') || content.includes('outage') || content.includes('blocker') || content.includes('production down') || content.includes('data loss')) {
      suggestedPriority = { code: 'URGENT', confidence: 0.95, evidence: 'Mentions crash, outage, or blocking production downtime.' };
      suggestedSeverity = { code: 'BLOCKER', confidence: 0.95, evidence: 'Critical system blockage or downtime detected.' };
    } else if (content.includes('security') || content.includes('vulnerability') || content.includes('unauthorized') || content.includes('leak')) {
      suggestedPriority = { code: 'URGENT', confidence: 0.92, evidence: 'Mentions security vulnerability or unauthorized access.' };
      suggestedSeverity = { code: 'CRITICAL', confidence: 0.92, evidence: 'Security-related defect flagged.' };
    } else if (content.includes('typo') || content.includes('spelling') || content.includes('cosmetic') || content.includes('alignment')) {
      suggestedPriority = { code: 'LOW', confidence: 0.89, evidence: 'Cosmetic or textual spelling issue.' };
      suggestedSeverity = { code: 'TRIVIAL', confidence: 0.90, evidence: 'Trivial visual polish item.' };
    }

    // 3. Suggested Component
    let suggestedComponent: any = undefined;
    const components = await this.dataSource.query(
      `SELECT id, name FROM components WHERE project_id = $1 AND is_active = true`,
      [projectId],
    );

    for (const comp of components) {
      if (content.includes(comp.name.toLowerCase())) {
        suggestedComponent = { name: comp.name, confidence: 0.87, evidence: `Direct keyword match on component name "${comp.name}".` };
        break;
      }
    }

    // 4. Suggested Labels
    const suggestedLabels: Array<{ name: string; confidence: number }> = [];
    if (content.includes('security') || content.includes('auth')) {
      suggestedLabels.push({ name: 'security', confidence: 0.90 });
    }
    if (content.includes('performance') || content.includes('slow') || content.includes('latency')) {
      suggestedLabels.push({ name: 'performance', confidence: 0.88 });
    }
    if (content.includes('ui') || content.includes('frontend') || content.includes('css')) {
      suggestedLabels.push({ name: 'frontend', confidence: 0.85 });
    }

    // 5. Suggested Assignee
    const routing = await this.suggestRouting(projectId, issueId, issue);
    let suggestedAssignee: any = undefined;
    if (routing) {
      const userRes = await this.dataSource.query('SELECT display_name as "displayName" FROM users WHERE id = $1', [routing.suggestedAssigneeId]);
      suggestedAssignee = {
        userId: routing.suggestedAssigneeId,
        displayName: userRes[0]?.displayName || 'Team Member',
        reason: routing.reason,
      };
    }

    const triageResult: AiTriageSuggestionDto = {
      suggestedIssueType,
      suggestedComponent,
      suggestedPriority,
      suggestedSeverity,
      suggestedLabels,
      suggestedAssignee,
    };

    // Log suggestion record
    const inputHash = crypto.createHash('sha256').update(issueId + 'triage').digest('hex');
    await this.dataSource.query(
      `INSERT INTO ai_suggestions (organization_id, project_id, issue_id, type, model, input_hash, result, confidence, status)
       VALUES ($1, $2, $3, 'TRIAGE', 'heuristic-triage-v1', $4, $5::jsonb, $6, 'PENDING')`,
      [issue.organizationId, projectId, issueId, inputHash, JSON.stringify(triageResult), 0.85],
    );

    return triageResult;
  }

  /**
   * Suggest severity and priority rankings based on textual heuristics
   */
  async suggestMetadata(title: string, description: string): Promise<{ priority: string; severity: string; confidence: number }> {
    const content = `${title} ${description}`.toLowerCase();

    let priority = 'MEDIUM';
    let severity = 'MAJOR';
    let confidence = 0.7;

    if (content.includes('crash') || content.includes('downtime') || content.includes('blocker') || content.includes('outage')) {
      priority = 'URGENT';
      severity = 'BLOCKER';
      confidence = 0.95;
    } else if (content.includes('fail') || content.includes('error') || content.includes('broken')) {
      priority = 'HIGH';
      severity = 'CRITICAL';
      confidence = 0.85;
    } else if (content.includes('cosmetic') || content.includes('typo') || content.includes('spelling')) {
      priority = 'LOW';
      severity = 'TRIVIAL';
      confidence = 0.9;
    }

    return { priority, severity, confidence };
  }

  // -------------------------------------------------------------
  // Phase 19: AI Summaries with Caching & Audit Logging
  // -------------------------------------------------------------

  /**
   * Summarize issue description and commentary with caching & audit tracking
   */
  async summarizeIssue(issueId: string): Promise<AiSummaryDto> {
    const cacheKey = `ai_summary:${issueId}`;
    const cachedSummary = this.cacheService.get<AiSummaryDto>(cacheKey);
    if (cachedSummary) {
      return { ...cachedSummary, cached: true };
    }

    const issue = await this.issueService.getIssue(issueId);

    const comments = await this.dataSource.query(
      `SELECT body, created_at FROM comments WHERE issue_id = $1 ORDER BY created_at ASC`,
      [issueId],
    );

    const contextText = `
      Issue: ${issue.title}
      Description: ${issue.description || 'No description'}
      Status: ${issue.statusName}
      Comments:
      ${comments.map((c: any) => `- ${c.body}`).join('\n')}
    `;

    let summaryText = `**ForgeTrack AI Summary:**\nThis issue "${issue.title}" is currently in "${issue.statusName}" status. It contains ${comments.length} comment(s) in discussion. Priority is set to ${issue.priorityName || 'unset'}.`;
    const model = 'gemini-pro';

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `Generate a brief executive summary of this bug tracker issue and discussions:\n${contextText}` }] }],
            }),
          },
        );

        if (response.ok) {
          const json = await response.json();
          const llmText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (llmText) summaryText = llmText;
        }
      } catch (err) {
        this.logger.warn('Gemini summary failed, falling back to heuristics:', err);
      }
    }

    const inputHash = crypto.createHash('sha256').update(contextText).digest('hex');

    // Audit log summary record
    await this.dataSource.query(
      `INSERT INTO ai_suggestions (organization_id, project_id, issue_id, type, model, input_hash, result, confidence, status)
       VALUES ($1, $2, $3, 'SUMMARY', $4, $5, $6::jsonb, 0.90, 'PENDING')`,
      [
        issue.organizationId,
        issue.projectId,
        issueId,
        model,
        inputHash,
        JSON.stringify({ summary: summaryText }),
      ],
    );

    const summaryResult: AiSummaryDto = {
      issueId,
      summary: summaryText,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    this.cacheService.set(cacheKey, summaryResult, 600); // 10 minutes cache
    return summaryResult;
  }

  /**
   * Suggest optimal assignee based on component leads and developer workloads
   */
  async suggestRouting(projectId: string, issueId: string, preFetchedIssue?: any): Promise<{ suggestedAssigneeId: string; reason: string } | null> {
    const issue = preFetchedIssue || (await this.issueService.getIssue(issueId));
    if (!issue) return null;

    if (issue.componentId) {
      const compRes = await this.dataSource.query(
        'SELECT lead_user_id as "leadId" FROM components WHERE id = $1 LIMIT 1',
        [issue.componentId],
      );
      if (compRes.length > 0 && compRes[0].leadId) {
        return {
          suggestedAssigneeId: compRes[0].leadId,
          reason: 'Suggested component lead for this issue component area.',
        };
      }
    }

    const members = await this.dataSource.query(
      `SELECT pm.user_id as "userId", u.display_name as "displayName",
              (SELECT COUNT(*) FROM issues i JOIN statuses s ON s.id = i.status_id WHERE i.assignee_id = pm.user_id AND i.project_id = $1 AND s.category != 'DONE') as "load"
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1 AND pm.role IN ('ADMIN', 'MAINTAINER', 'DEVELOPER')
       ORDER BY "load" ASC LIMIT 1`,
      [projectId],
    );

    if (members.length > 0) {
      return {
        suggestedAssigneeId: members[0].userId,
        reason: `Assigned to ${members[0].displayName} due to having lowest active project workload (${members[0].load} issues).`,
      };
    }

    return null;
  }

  /**
   * Accept an AI suggestion (e.g. marking duplicate relationship)
   */
  async acceptSuggestion(suggestionId: string, userId: string): Promise<any> {
    const res = await this.dataSource.query(
      `SELECT id, organization_id as "orgId", project_id as "projectId", issue_id as "issueId", type, result, status
       FROM ai_suggestions WHERE id = $1 LIMIT 1`,
      [suggestionId],
    );
    if (res.length === 0) throw new NotFoundException('AI suggestion not found');
    const suggestion = res[0];

    // If duplicate suggestion, create issue relationship
    if (suggestion.type === 'DUPLICATE' && suggestion.result?.topCandidate?.issueId) {
      const targetIssueId = suggestion.result.topCandidate.issueId;
      await this.dataSource.query(
        `INSERT INTO issue_relationships (organization_id, source_issue_id, target_issue_id, relationship_type, created_by)
         VALUES ($1, $2, $3, 'DUPLICATE', $4)
         ON CONFLICT (source_issue_id, target_issue_id, relationship_type) DO NOTHING`,
        [suggestion.orgId, suggestion.issueId, targetIssueId, userId],
      );
    }

    const updated = await this.dataSource.query(
      `UPDATE ai_suggestions SET status = 'ACCEPTED' WHERE id = $1
       RETURNING id, type, status, result, confidence, created_at as "createdAt"`,
      [suggestionId],
    );

    this.logger.log(`User ${userId} accepted AI suggestion ${suggestionId}`);
    return updated[0];
  }

  /**
   * Reject an AI suggestion
   */
  async rejectSuggestion(suggestionId: string, userId: string): Promise<any> {
    const updated = await this.dataSource.query(
      `UPDATE ai_suggestions SET status = 'REJECTED' WHERE id = $1
       RETURNING id, type, status, result, confidence, created_at as "createdAt"`,
      [suggestionId],
    );
    if (updated.length === 0) throw new NotFoundException('AI suggestion not found');
    this.logger.log(`User ${userId} rejected AI suggestion ${suggestionId}`);
    return updated[0];
  }

  /**
   * List suggestions for an entire project (for AI Studio & Workbench)
   */
  async getProjectSuggestions(projectId: string): Promise<any[]> {
    const rows = await this.dataSource.query(
      `SELECT s.id, s.organization_id as "organizationId", s.project_id as "projectId",
              s.issue_id as "issueId", s.type, s.model, s.result, s.confidence, s.status,
              s.created_at as "createdAt", i.title as "issueTitle", i.number as "issueNumber",
              p.key as "projectKey"
       FROM ai_suggestions s
       LEFT JOIN issues i ON i.id = s.issue_id
       LEFT JOIN projects p ON p.id = s.project_id
       WHERE s.project_id = $1 AND s.status = 'PENDING'
       ORDER BY s.created_at DESC LIMIT 20`,
      [projectId],
    );

    return rows.map((r: any) => ({
      id: r.id,
      type: r.type === 'DUPLICATE' ? 'Duplicate Warning' : 'Triage Recommendation',
      title: r.result?.topCandidate?.title
        ? `Potential duplicate with ${r.result.topCandidate.issueKey}: "${r.result.topCandidate.title}"`
        : `AI Recommendation for ${r.projectKey || 'ISSUE'}-${r.issueNumber || ''}: ${r.issueTitle || 'Defect'}`,
      confidence: Number(r.confidence) || 0.85,
      status: r.status,
    }));
  }

  /**
   * List suggestions for a specific issue
   */
  async getIssueSuggestions(issueId: string): Promise<AiSuggestionRecordDto[]> {
    return this.dataSource.query(
      `SELECT id, organization_id as "organizationId", project_id as "projectId",
              issue_id as "issueId", type, model, result, confidence, status,
              created_at as "createdAt"
       FROM ai_suggestions
       WHERE issue_id = $1
       ORDER BY created_at DESC`,
      [issueId],
    );
  }

  /**
   * Interactive duplicate scan on arbitrary text against existing project issues
   */
  /**
   * Interactive duplicate scan on arbitrary text against existing project issues
   */
  async testDuplicateCheck(projectId: string, title: string, description: string): Promise<any[]> {
    const text = `Title: ${title}\nDescription: ${description || ''}`;
    const queryVector = await this.embeddingService.generateEmbedding(text);

    // Fetch all issues in the project
    const issues = await this.dataSource.query(
      `SELECT i.id as "issueId", i.title, i.description, i.number, p.key as "projectKey"
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       WHERE i.project_id = $1 AND i.deleted_at IS NULL
       ORDER BY i.created_at DESC`,
      [projectId],
    );

    const duplicates: any[] = [];
    for (const issue of issues) {
      const issueText = `Title: ${issue.title}\nDescription: ${issue.description || ''}`;
      const issueVector = await this.embeddingService.generateEmbedding(issueText);

      const vectorSim = this.embeddingService.cosineSimilarity(queryVector, issueVector);
      
      // Calculate token Jaccard similarity
      const cleanQ = (title + ' ' + (description || '')).toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const cleanI = (issue.title + ' ' + (issue.description || '')).toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const setQ = new Set(cleanQ);
      const setI = new Set(cleanI);
      let intersection = 0;
      for (const w of setQ) {
        if (setI.has(w)) intersection++;
      }
      const union = new Set([...cleanQ, ...cleanI]).size;
      const jaccardSim = union > 0 ? intersection / union : 0;

      // Direct title match
      const isExactTitle = title.trim().toLowerCase() === issue.title.trim().toLowerCase();
      const combinedSim = isExactTitle ? 1.0 : Math.max(vectorSim, jaccardSim * 0.9 + vectorSim * 0.1);

      if (combinedSim >= 0.65 || isExactTitle) {
        const reason = this.generateDuplicateReason(title, issue.title, combinedSim);
        duplicates.push({
          issueId: issue.issueId,
          issueKey: `${issue.projectKey}-${issue.number}`,
          title: issue.title,
          similarity: parseFloat(combinedSim.toFixed(4)),
          reason,
        });
      }
    }

    duplicates.sort((a, b) => b.similarity - a.similarity);
    return duplicates;
  }

  /**
   * Scan all issues in a project to identify existing duplicate pairs
   */
  async scanAllProjectDuplicates(projectId: string): Promise<any[]> {
    const issues = await this.dataSource.query(
      `SELECT i.id, i.title, i.description, i.number, i.status_id as "statusId", p.key as "projectKey"
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       WHERE i.project_id = $1 AND i.deleted_at IS NULL
       ORDER BY i.created_at DESC`,
      [projectId],
    );

    const duplicatePairs: any[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < issues.length; i++) {
      for (let j = i + 1; j < issues.length; j++) {
        const a = issues[i];
        const b = issues[j];
        const pairKey = [a.id, b.id].sort().join('-');
        if (processed.has(pairKey)) continue;
        processed.add(pairKey);

        const textA = `Title: ${a.title}\nDescription: ${a.description || ''}`;
        const textB = `Title: ${b.title}\nDescription: ${b.description || ''}`;
        const vecA = await this.embeddingService.generateEmbedding(textA);
        const vecB = await this.embeddingService.generateEmbedding(textB);

        const vectorSim = this.embeddingService.cosineSimilarity(vecA, vecB);
        const isExactTitle = a.title.trim().toLowerCase() === b.title.trim().toLowerCase();
        const combinedSim = isExactTitle ? 1.0 : vectorSim;

        if (combinedSim >= 0.65 || isExactTitle) {
          duplicatePairs.push({
            primaryIssue: {
              id: a.id,
              key: `${a.projectKey}-${a.number}`,
              title: a.title,
            },
            duplicateIssue: {
              id: b.id,
              key: `${b.projectKey}-${b.number}`,
              title: b.title,
            },
            similarity: parseFloat(combinedSim.toFixed(4)),
            reason: isExactTitle ? 'Identical defect title and description' : `High textual similarity (${Math.round(combinedSim * 100)}%)`,
          });
        }
      }
    }

    duplicatePairs.sort((a, b) => b.similarity - a.similarity);
    return duplicatePairs;
  }

  /**
   * Interactive quality audit on arbitrary text
   */
  testQualityCheck(title: string, description: string): any {
    const findings: string[] = [];
    let score = 100;

    const trimmedTitle = (title || '').trim();
    const trimmedDesc = (description || '').trim();

    if (trimmedTitle.length < 10) {
      findings.push('⚠️ Title is short (< 10 chars). Add more specific defect details.');
      score -= 20;
    } else {
      findings.push('✅ Title length is descriptive.');
    }

    if (trimmedDesc.length < 30) {
      findings.push('⚠️ Description is too brief. Please explain context and steps.');
      score -= 25;
    } else {
      findings.push('✅ Detailed description provided.');
    }

    if (trimmedDesc.toLowerCase().includes('step') || trimmedDesc.toLowerCase().includes('reproduce') || trimmedDesc.includes('1.') || trimmedDesc.includes('1)')) {
      findings.push('✅ Step-by-step reproduction sequence detected.');
    } else {
      findings.push('⚠️ Missing step-by-step reproduction instructions.');
      score -= 20;
    }

    if (trimmedDesc.toLowerCase().includes('expect') || trimmedDesc.toLowerCase().includes('actual')) {
      findings.push('✅ Expected vs actual behavior clearly stated.');
    } else {
      findings.push('⚠️ Consider clarifying expected vs actual behavior.');
      score -= 15;
    }

    if (score < 0) score = 0;

    return {
      score,
      findings,
    };
  }

  /**
   * Interactive triage on arbitrary text
   */
  testTriage(title: string, description: string): any {
    const content = `${title} ${description}`.toLowerCase();
    let type = 'BUG';
    let priority = 'MEDIUM';
    let severity = 'MAJOR';
    let component = 'Core Engine';
    let confidence = 0.85;

    if (content.includes('feature') || content.includes('enhancement') || content.includes('support')) {
      type = 'FEATURE';
      priority = 'LOW';
      severity = 'MINOR';
    } else if (content.includes('task') || content.includes('refactor') || content.includes('clean')) {
      type = 'TASK';
      priority = 'MEDIUM';
      severity = 'TRIVIAL';
    }

    if (content.includes('crash') || content.includes('security') || content.includes('vulnerability') || content.includes('outage')) {
      priority = 'URGENT';
      severity = 'BLOCKER';
      confidence = 0.96;
    } else if (content.includes('timeout') || content.includes('slow') || content.includes('auth') || content.includes('login')) {
      priority = 'HIGH';
      severity = 'CRITICAL';
      component = 'Authentication / Security';
      confidence = 0.91;
    } else if (content.includes('ui') || content.includes('button') || content.includes('css') || content.includes('modal')) {
      component = 'Frontend / UI';
    } else if (content.includes('db') || content.includes('sql') || content.includes('database')) {
      component = 'Database';
    }

    return {
      type,
      priority,
      severity,
      component,
      confidence,
    };
  }
}
