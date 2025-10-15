import { IsOptional, IsNumber } from 'class-validator';
export class GetPostDto {
  @IsNumber()
  id: number;

  @IsNumber()
  @IsOptional()
  viewerId?: number;
}
