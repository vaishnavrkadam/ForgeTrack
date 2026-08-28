import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Add a comment to an issue, register the author as watcher, and dispatch outbox event
   */
  async addComment(issueId: string, userId: string, body: string, isPrivate: boolean = false): Promise<any> {
    const issueRes = await this.dataSource.query(
      `SELECT i.organization_id as "orgId", i.project_id as "projectId" FROM issues i WHERE i.id = $1 LIMIT 1`,
      [issueId],
    );
    if (issueRes.length === 0) throw new NotFoundException('Issue not found');
    const issue = issueRes[0];

    return this.dataSource.transaction(async (manager) => {
      // 1. Insert comment
      const commentRes = await manager.query(
        `INSERT INTO comments (organization_id, issue_id, author_id, body, is_private)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, body, is_private as "isPrivate", created_at as "createdAt"`,
        [issue.orgId, issueId, userId, body, isPrivate],
      );
      const comment = commentRes[0];

      // 2. Parse @username mentions (matches alphanumeric words prefixed with @)
      const mentions: string[] = [];
      const regex = /@(\w+)/g;
      let match;
      while ((match = regex.exec(body)) !== null) {
        mentions.push(match[1]);
      }

      // 3. Register commenter as watcher automatically
      await manager.query(
        `INSERT INTO watchers (organization_id, issue_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (issue_id, user_id) DO NOTHING`,
        [issue.orgId, issueId, userId],
      );

      // 4. Log Outbox Event
      await this.notificationService.logOutboxEvent(manager, issue.orgId, 'comment_created', {
        id: comment.id,
        issueId,
        authorId: userId,
        mentions,
        bodyText: body.substring(0, 100),
      });

      return comment;
    });
  }

  /**
   * List comments on an issue, hiding private comments if checked by non-member
   */
  async listComments(issueId: string, userId: string): Promise<any[]> {
    const issueRes = await this.dataSource.query(
      `SELECT project_id as "projectId" FROM issues WHERE id = $1 LIMIT 1`,
      [issueId],
    );
    if (issueRes.length === 0) throw new NotFoundException('Issue not found');
    const projectId = issueRes[0].projectId;

    // Check project member role
    const memberRes = await this.dataSource.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
      [projectId, userId],
    );
    const isMember = memberRes.length > 0 && memberRes[0].role !== 'GUEST';

    const query = isMember
      ? `SELECT c.id, c.body, c.is_private as "isPrivate", c.created_at as "createdAt",
                u.display_name as "authorName", u.email as "authorEmail"
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.issue_id = $1
         ORDER BY c.created_at ASC`
      : `SELECT c.id, c.body, c.is_private as "isPrivate", c.created_at as "createdAt",
                u.display_name as "authorName", u.email as "authorEmail"
         FROM comments c
         JOIN users u ON u.id = c.author_id
         WHERE c.issue_id = $1 AND c.is_private = false
         ORDER BY c.created_at ASC`;

    return this.dataSource.query(query, [issueId]);
  }

  /**
   * Edit comment and write to comment_revisions table
   */
  async editComment(commentId: string, userId: string, newBody: string): Promise<any> {
    const commentRes = await this.dataSource.query(
      `SELECT organization_id as "orgId", body, author_id as "authorId" FROM comments WHERE id = $1 LIMIT 1`,
      [commentId],
    );
    if (commentRes.length === 0) throw new NotFoundException('Comment not found');
    const comment = commentRes[0];

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You cannot edit someone else\'s comment');
    }

    return this.dataSource.transaction(async (manager) => {
      // Record revision
      await manager.query(
        `INSERT INTO comment_revisions (organization_id, comment_id, author_id, old_body, new_body)
         VALUES ($1, $2, $3, $4, $5)`,
        [comment.orgId, commentId, userId, comment.body, newBody],
      );

      // Update comment
      const updated = await manager.query(
        `UPDATE comments SET body = $1, updated_at = now() WHERE id = $2 RETURNING id, body, updated_at as "updatedAt"`,
        [newBody, commentId],
      );
      return updated[0];
    });
  }

  /**
   * Delete specific comment
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const commentRes = await this.dataSource.query(
      `SELECT author_id as "authorId", issue_id as "issueId" FROM comments WHERE id = $1 LIMIT 1`,
      [commentId],
    );
    if (commentRes.length === 0) throw new NotFoundException('Comment not found');
    const comment = commentRes[0];

    // Check project admin override
    const issueRes = await this.dataSource.query(
      `SELECT project_id as "projectId" FROM issues WHERE id = $1 LIMIT 1`,
      [comment.issueId],
    );
    const projectId = issueRes[0].projectId;

    const pmRes = await this.dataSource.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
      [projectId, userId],
    );
    const isProjectAdmin = pmRes.length > 0 && pmRes[0].role === 'ADMIN';

    if (comment.authorId !== userId && !isProjectAdmin) {
      throw new ForbiddenException('You are not authorized to delete this comment');
    }

    await this.dataSource.query('DELETE FROM comments WHERE id = $1', [commentId]);
  }

  /**
   * Toggle watching status of an issue card
   */
  async toggleWatching(issueId: string, userId: string): Promise<{ watching: boolean }> {
    const issueRes = await this.dataSource.query(
      `SELECT organization_id as "orgId" FROM issues WHERE id = $1 LIMIT 1`,
      [issueId],
    );
    if (issueRes.length === 0) throw new NotFoundException('Issue not found');
    const orgId = issueRes[0].orgId;

    const watchRes = await this.dataSource.query(
      `SELECT id FROM watchers WHERE issue_id = $1 AND user_id = $2 LIMIT 1`,
      [issueId, userId],
    );

    if (watchRes.length > 0) {
      await this.dataSource.query('DELETE FROM watchers WHERE id = $1', [watchRes[0].id]);
      return { watching: false };
    } else {
      await this.dataSource.query(
        `INSERT INTO watchers (organization_id, issue_id, user_id) VALUES ($1, $2, $3)`,
        [orgId, issueId, userId],
      );
      return { watching: true };
    }
  }

  /**
   * List issue watchers
   */
  async listWatchers(issueId: string): Promise<any[]> {
    return this.dataSource.query(
      `SELECT u.id, u.display_name as "displayName", u.email
       FROM watchers w
       JOIN users u ON u.id = w.user_id
       WHERE w.issue_id = $1`,
      [issueId],
    );
  }
}
