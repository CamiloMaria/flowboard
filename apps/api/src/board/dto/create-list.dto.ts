import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateListDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
