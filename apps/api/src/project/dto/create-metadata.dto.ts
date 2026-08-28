import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  role!: string; // ADMIN, MAINTAINER, DEVELOPER, REPORTER, VIEWER, GUEST
}

export class CreateComponentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsOptional()
  leadUserId?: string;

  @IsUUID()
  @IsOptional()
  defaultAssigneeId?: string;
}

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;
}

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
