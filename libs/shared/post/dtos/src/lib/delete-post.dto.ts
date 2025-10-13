import { IsNumber } from 'class-validator';
export class DeletePostDto {
  @IsNumber()
  authorId: number;
  @IsNumber()
  postId: number;
}
