import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';

import { Public } from '@/auth/public.decorator';

import { HealthService } from './health.service';

@Public()
@SkipThrottle()
@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOkResponse({ description: 'The process is up. Touches no database.' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Postgres and Redis respond' })
  @ApiServiceUnavailableResponse({ description: 'A dependency is down' })
  async ready(@Res({ passthrough: true }) response: Response) {
    const readiness = await this.healthService.checkReadiness();

    if (!readiness.ready) response.status(HttpStatus.SERVICE_UNAVAILABLE);

    return readiness;
  }
}
