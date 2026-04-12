import { IsString, MinLength, MaxLength, IsUUID, IsOptional, Matches } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsUUID()
  listId!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'coverColor must be a valid hex color' })
  coverColor?: string;
}
