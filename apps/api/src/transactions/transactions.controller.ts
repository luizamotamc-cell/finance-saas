import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateTransactionDto, ListTransactionsQuery, UpdateTransactionDto } from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private service: TransactionsService) {}

  @Get() findAll(@CurrentUser() u: AuthUser, @Query() q: ListTransactionsQuery) {
    return this.service.findAll(u.id, q);
  }

  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.service.create(u.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.update(u.id, id, dto);
  }

  @Delete(':id') @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.id, id);
  }
}
