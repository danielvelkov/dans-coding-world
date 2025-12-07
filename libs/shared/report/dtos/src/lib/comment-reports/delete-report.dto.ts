import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
export class DeleteReportDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  reportId: number;
}
