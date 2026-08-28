import { IsOptional, IsString, IsUUID, IsArray, IsObject } from 'class-validator';

export class SearchIssueDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsUUID()
  @IsOptional()
  projectId?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  statusIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  priorityIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  severityIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  assigneeIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  reporterIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  componentIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  versionIds?: string[];

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  milestoneIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
