import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() u: AuthUser, @Query('month') month?: string) {
    return this.service.summary(u.id, month);
  }
}
