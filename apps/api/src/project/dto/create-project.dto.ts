import { IsNotEmpty, IsString, IsUppercase, Length, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @IsUppercase()
  @Length(2, 10, { message: 'Project key must be between 2 and 10 characters' })
  @Matches(/^[A-Z0-9]+$/, { message: 'Project key must contain only uppercase alphanumeric characters' })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 100, { message: 'Project name must be between 3 and 100 characters' })
  name!: string;

  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  visibility!: 'PUBLIC' | 'PRIVATE';
}
