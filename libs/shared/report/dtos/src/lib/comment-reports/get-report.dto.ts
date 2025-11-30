import { IsInt, Min } from 'class-validator';
import { ToInteger } from '@dans-coding-world/validation';
export class GetReportDto {
  @IsInt()
  @Min(0)
  @ToInteger()
  reportId: number;
}
