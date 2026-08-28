import { IsNotEmpty, IsUUID, IsOptional, IsString } from 'class-validator';

export class TransitionIssueDto {
  @IsUUID()
  @IsNotEmpty()
  toStatusId!: string;

  @IsString()
  @IsOptional()
  comment?: string;
}
