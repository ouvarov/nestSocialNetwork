import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const MAX_PAGE_SIZE = 50;

export class PageQueryDto {
  @ApiPropertyOptional({
    maximum: MAX_PAGE_SIZE,
    description: 'Each list has its own default page size',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({ description: 'nextCursor from the previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
