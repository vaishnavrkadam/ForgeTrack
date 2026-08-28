import { IntegrationService } from '../src/integration/integration.service';

describe('Phase 20 — Import / Export Maturity', () => {
  let integrationService: IntegrationService;
  let mockDataSource: any;
  let mockIssueService: any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };
    mockIssueService = {
      getIssue: jest.fn(),
      createIssue: jest.fn(),
    };
    integrationService = new IntegrationService(mockDataSource as any, mockIssueService as any);
  });

  describe('CSV Parser', () => {
    it('should parse standard CSV with headers and escaped quoted cells', () => {
      const csv = `Title,Description,Priority,Severity\n"Crash on load","App fails with ""null pointer"" exception",URGENT,BLOCKER\n"UI Typo","Spelling mistake in footer",LOW,TRIVIAL`;
      const parsed = integrationService.parseCsv(csv);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('Crash on load');
      expect(parsed[0].description).toBe('App fails with "null pointer" exception');
      expect(parsed[0].priority).toBe('URGENT');
      expect(parsed[0].severity).toBe('BLOCKER');

      expect(parsed[1].title).toBe('UI Typo');
      expect(parsed[1].priority).toBe('LOW');
    });

    it('should handle multiline quoted fields in CSV', () => {
      const csv = `Title,Description\n"Complex bug","Step 1: open app\nStep 2: click login\nStep 3: crash"`;
      const parsed = integrationService.parseCsv(csv);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Complex bug');
      expect(parsed[0].description).toContain('Step 1: open app');
      expect(parsed[0].description).toContain('Step 3: crash');
    });
  });

  describe('Bugzilla Compatibility Parser', () => {
    it('should convert Bugzilla bug records to ForgeTrack issue structure', () => {
      const bugzillaPayload = {
        bugs: [
          {
            summary: 'Kernel memory leak in networking stack',
            description: 'Packets dropped after 24h continuous traffic',
            priority: 'P1',
            severity: 'critical',
            op_sys: 'Linux',
            rep_platform: 'x86_64',
            version: '5.15',
          },
        ],
      };

      const issues = integrationService.parseBugzilla(bugzillaPayload);

      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Kernel memory leak in networking stack');
      expect(issues[0].typeCode).toBe('BUG');
      expect(issues[0].priorityCode).toBe('URGENT');
      expect(issues[0].severityCode).toBe('CRITICAL');
      expect(issues[0].environment.os).toBe('Linux');
    });
  });

  describe('CSV Export Formatter', () => {
    it('should export all issues into RFC 4180 CSV string', async () => {
      mockDataSource.query.mockResolvedValueOnce([{ id: 'issue-1' }]);
      mockIssueService.getIssue.mockResolvedValueOnce({
        id: 'issue-1',
        key: 'PAY-101',
        number: 101,
        title: 'Payment Gateway Timeout',
        description: 'Timeout after "60s" waiting for response',
        issueTypeName: 'Bug',
        statusName: 'In Progress',
        priorityName: 'High',
        severityName: 'Major',
        componentName: 'Billing',
        versionName: 'v1.0.0',
        milestoneName: 'Q3 Launch',
        assigneeName: 'Alice',
        reporterName: 'Bob',
        estimateMinutes: 120,
        timeSpentMinutes: 45,
        createdAt: '2026-08-28T00:00:00Z',
      });

      const csv = await integrationService.exportIssuesCsv('proj-1');

      expect(csv).toContain('Key,Number,Title,Description');
      expect(csv).toContain('"PAY-101"');
      expect(csv).toContain('"Payment Gateway Timeout"');
      expect(csv).toContain('Timeout after ""60s"" waiting for response');
    });
  });
});
