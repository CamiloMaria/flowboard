import { IsUUID, IsNumber } from 'class-validator';

export class MoveCardDto {
  @IsUUID()
  targetListId!: string;

  @IsNumber()
  newPosition!: number;
}
