import { IsString, IsUUID, IsOptional, IsInt, IsDateString, IsArray, IsObject, Length } from 'class-validator';

export class UpdateIssueDto {
  @IsUUID()
  @IsOptional()
  issueTypeId?: string;

  @IsString()
  @IsOptional()
  @Length(3, 200, { message: 'Issue title must be between 3 and 200 characters' })
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  statusId?: string;

  @IsUUID()
  @IsOptional()
  priorityId?: string;

  @IsUUID()
  @IsOptional()
  severityId?: string;

  @IsUUID()
  @IsOptional()
  componentId?: string;

  @IsUUID()
  @IsOptional()
  versionId?: string;

  @IsUUID()
  @IsOptional()
  milestoneId?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  reproductionSteps?: string;

  @IsString()
  @IsOptional()
  expectedResult?: string;

  @IsString()
  @IsOptional()
  actualResult?: string;

  @IsObject()
  @IsOptional()
  environment?: Record<string, any>;

  @IsString()
  @IsOptional()
  acceptanceCriteria?: string;

  @IsInt()
  @IsOptional()
  estimateMinutes?: number;

  @IsInt()
  @IsOptional()
  timeSpentMinutes?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  labelIds?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
