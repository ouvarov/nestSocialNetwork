import { ApiProperty } from '@nestjs/swagger';

const DEPENDENCY_STATUSES = ['up', 'down', 'disabled'] as const;

type DependencyStatus = (typeof DEPENDENCY_STATUSES)[number];

export class LivenessDto {
  @ApiProperty({ enum: ['ok'] })
  status: 'ok';
}

export class ReadinessDto {
  @ApiProperty()
  ready: boolean;

  @ApiProperty({ enum: DEPENDENCY_STATUSES })
  database: DependencyStatus;

  @ApiProperty({
    enum: DEPENDENCY_STATUSES,
    description: '"disabled" when REDIS_URL is not set',
  })
  redis: DependencyStatus;
}

export type { DependencyStatus };
