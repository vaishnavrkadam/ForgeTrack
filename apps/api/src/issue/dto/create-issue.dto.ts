import { IsNotEmpty, IsString, IsOptional, IsInt, IsDateString, IsArray, IsObject, Length } from 'class-validator';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 200, { message: 'Issue title must be between 2 and 200 characters' })
  title!: string;

  @IsString()
  @IsOptional()
  issueTypeId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  issueType?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  statusId?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priorityId?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  severityId?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  componentId?: string;

  @IsString()
  @IsOptional()
  component?: string;

  @IsString()
  @IsOptional()
  versionId?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  milestoneId?: string;

  @IsString()
  @IsOptional()
  milestone?: string;

  @IsString()
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

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @IsOptional()
  labelIds?: string[];

  @IsArray()
  @IsOptional()
  labels?: string[];

  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}
