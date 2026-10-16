import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TxType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

class ListCategoriesQuery {
  @IsOptional() @IsEnum(TxType)
  type?: TxType;
}

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get() findAll(@CurrentUser() u: AuthUser, @Query() q: ListCategoriesQuery) {
    return this.service.findAll(u.id, q.type);
  }

  @Post() create(@CurrentUser() u: AuthUser, @Body() dto: CreateCategoryDto) {
    return this.service.create(u.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.update(u.id, id, dto);
  }

  @Delete(':id') @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(u.id, id);
  }
}
