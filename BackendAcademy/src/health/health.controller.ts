import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { resolveHealthProbe } from './coverage';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  getHealth(@Query('probe') probe?: string | string[]) {
    const selectedProbe = resolveHealthProbe(probe);

    return {
      status: 'ok',
      service: 'backend-academy',
      probe: selectedProbe,
      timestamp: new Date().toISOString(),
    };
  }
}
