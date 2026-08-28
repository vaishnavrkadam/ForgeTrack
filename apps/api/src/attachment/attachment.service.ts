import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class AttachmentService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
  private readonly DANGEROUS_MIMES = [
    'text/html',
    'application/javascript',
    'application/x-msdownload',
    'application/x-sh',
    'application/x-php',
  ];

  constructor(private readonly dataSource: DataSource) {
    // Create upload directory if it does not exist
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload file attachment, validate MIME types and sizes, and save to uploads/
   */
  async uploadAttachment(issueId: string, uploaderId: string, file: any): Promise<any> {
    const issueRes = await this.dataSource.query(
      `SELECT organization_id as "orgId" FROM issues WHERE id = $1 LIMIT 1`,
      [issueId],
    );
    if (issueRes.length === 0) throw new NotFoundException('Issue not found');
    const orgId = issueRes[0].orgId;

    // Size Validation
    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException('File size exceeds the 10MB maximum limit');
    }

    // MIME Validation (reject dangerous formats)
    if (this.DANGEROUS_MIMES.includes(file.mimetype.toLowerCase())) {
      throw new BadRequestException('Executable or dangerous file types are not allowed');
    }

    // Binary content validation security scan hook
    const isClean = await this.scanFile(file.buffer);
    if (!isClean) {
      throw new BadRequestException('Security scan failed: Executable headers or script injections detected');
    }

    // Generate unique name and path
    const fileUuid = crypto.randomUUID();
    const safeName = `${fileUuid}-${path.basename(file.originalname)}`;
    const fullPath = path.join(this.uploadDir, safeName);

    // Save to filesystem
    await fs.promises.writeFile(fullPath, file.buffer);

    // Save record to DB
    const res = await this.dataSource.query(
      `INSERT INTO attachments (organization_id, issue_id, uploader_id, filename, file_path, file_size, content_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, filename, file_size as "fileSize", content_type as "contentType", created_at as "createdAt"`,
      [orgId, issueId, uploaderId, file.originalname, fullPath, file.size, file.mimetype],
    );

    return res[0];
  }

  /**
   * Get attachment details and check for local file existence
   */
  async getAttachment(attachmentId: string): Promise<{ filename: string; contentType: string; filePath: string }> {
    const res = await this.dataSource.query(
      `SELECT filename, content_type as "contentType", file_path as "filePath"
       FROM attachments WHERE id = $1 LIMIT 1`,
      [attachmentId],
    );
    if (res.length === 0) throw new NotFoundException('Attachment not found');
    const att = res[0];

    if (!fs.existsSync(att.filePath)) {
      throw new NotFoundException('Attachment file does not exist on disk');
    }

    return att;
  }

  /**
   * Delete attachment and clean up from disk
   */
  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const res = await this.dataSource.query(
      `SELECT uploader_id as "uploaderId", file_path as "filePath", issue_id as "issueId"
       FROM attachments WHERE id = $1 LIMIT 1`,
      [attachmentId],
    );
    if (res.length === 0) throw new NotFoundException('Attachment not found');
    const att = res[0];

    // Check project admin override
    const issueRes = await this.dataSource.query(
      `SELECT project_id as "projectId" FROM issues WHERE id = $1 LIMIT 1`,
      [att.issueId],
    );
    const projectId = issueRes[0].projectId;

    const pmRes = await this.dataSource.query(
      `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
      [projectId, userId],
    );
    const isProjectAdmin = pmRes.length > 0 && pmRes[0].role === 'ADMIN';

    if (att.uploaderId !== userId && !isProjectAdmin) {
      throw new ForbiddenException('You are not authorized to delete this attachment');
    }

    // Delete database record
    await this.dataSource.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

    // Delete file from disk
    if (fs.existsSync(att.filePath)) {
      await fs.promises.unlink(att.filePath);
    }
  }

  /**
   * Run a mock anti-malware/executable inspection scan on binary buffer
   */
  private async scanFile(buffer: Buffer): Promise<boolean> {
    if (!buffer || buffer.length === 0) return true;

    // 1. Check for DOS/Windows executable signature (MZ header = 0x4d 0x5a)
    if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
      console.warn('[Security Scanner] Upload blocked: MZ Windows executable signature detected');
      return false;
    }

    // 2. Check for ELF header (0x7f 0x45 0x4c 0x46)
    if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
      console.warn('[Security Scanner] Upload blocked: ELF Linux executable signature detected');
      return false;
    }

    // 3. Simple text signature scan for raw code injections (HTML scripts or PHP tags)
    const contentString = buffer.toString('utf8', 0, Math.min(buffer.length, 4096)).toLowerCase();
    if (contentString.includes('<script') || contentString.includes('<?php')) {
      console.warn('[Security Scanner] Upload blocked: Script tag or PHP signature detected in payload');
      return false;
    }

    return true;
  }
}
