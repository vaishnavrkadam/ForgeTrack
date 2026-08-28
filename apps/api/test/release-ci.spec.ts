import { ReleaseCiService } from '../src/release-ci/release-ci.service';

describe('Phase 16 — CI / Release Intelligence', () => {
  let releaseCiService: ReleaseCiService;
  let mockDataSource: any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };
    releaseCiService = new ReleaseCiService(mockDataSource as any);
  });

  it('should record CI run and link to issues matching commit SHA', async () => {
    const fakeCiRun = {
      id: 'ci-run-1',
      organizationId: 'org-1',
      projectId: 'proj-1',
      commitSha: 'a1b2c3d4',
      status: 'SUCCESS',
      workflowName: 'Test & Build',
      url: 'https://ci.example.com/build/10',
    };

    mockDataSource.query
      .mockResolvedValueOnce([fakeCiRun]) // insert ci_runs
      .mockResolvedValueOnce([{ issueId: 'issue-101' }]) // select matching code_links
      .mockResolvedValueOnce([]); // insert CI_BUILD code_link

    const result = await releaseCiService.recordCiRun('org-1', 'proj-1', {
      commitSha: 'a1b2c3d4',
      status: 'SUCCESS',
      workflowName: 'Test & Build',
      url: 'https://ci.example.com/build/10',
    });

    expect(result.id).toBe('ci-run-1');
    expect(result.status).toBe('SUCCESS');
    expect(mockDataSource.query).toHaveBeenCalledTimes(3);
  });

  it('should compute release health with completion % and blocker risk factors', async () => {
    const versionId = 'version-uuid-1';
    const projectId = 'proj-uuid-1';

    // 1. Version lookup
    mockDataSource.query.mockResolvedValueOnce([
      { id: versionId, name: 'v2.1.0', status: 'ACTIVE', releaseDate: '2026-09-01' },
    ]);

    // 2. Version issues lookup (4 total: 2 Done, 1 In-Progress Blocker, 1 Todo)
    mockDataSource.query.mockResolvedValueOnce([
      { id: 'i1', number: 1, statusCategory: 'DONE', priorityCode: 'HIGH', severityCode: 'MAJOR' },
      { id: 'i2', number: 2, statusCategory: 'DONE', priorityCode: 'MEDIUM', severityCode: 'MINOR' },
      { id: 'i3', number: 3, statusCategory: 'IN_PROGRESS', priorityCode: 'URGENT', severityCode: 'BLOCKER' },
      { id: 'i4', number: 4, statusCategory: 'TODO', priorityCode: 'LOW', severityCode: 'TRIVIAL' },
    ]);

    // 3. CI stats lookup (10 total, 9 success, 1 failed -> 90% pass rate)
    mockDataSource.query.mockResolvedValueOnce([
      { totalRuns: '10', successRuns: '9', failedRuns: '1' },
    ]);

    const health = await releaseCiService.getReleaseHealth(projectId, versionId);

    expect(health.versionId).toBe(versionId);
    expect(health.totalIssues).toBe(4);
    expect(health.statusBreakdown.done).toBe(2);
    expect(health.statusBreakdown.inProgress).toBe(1);
    expect(health.statusBreakdown.todo).toBe(1);
    expect(health.completionPercentage).toBe(50);
    expect(health.blockingDefectsCount).toBe(1);
    expect(health.ciRunsSummary.passRatePercentage).toBe(90);
    expect(health.healthStatus).toBe('CRITICAL'); // because blockingDefectsCount > 0
    expect(health.riskFactors).toContain('1 uncompleted blocker defect(s) pending resolution.');
  });
});
