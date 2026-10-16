import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { AccountsService } from './accounts.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private service: AccountsService) {}

  @Get() findAll(@CurrentUser() u: AuthUser) {
    return this.service.findAll(u.id);
  }

  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateAccountDto) {
    return this.service.create(u.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAccountDto) {
    return this.service.update(u.id, id, dto);
  }

  @Delete(':id') @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.id, id);
  }
}
