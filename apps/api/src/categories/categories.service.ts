import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string, type?: TxType) {
    return this.prisma.category.findMany({
      where: { userId, ...(type && { type }) },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    try {
      return await this.prisma.category.create({ data: { ...dto, userId } });
    } catch (e) {
      this.handleUnique(e);
    }
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.ensureOwned(userId, id);
    try {
      return await this.prisma.category.update({ where: { id }, data: dto });
    } catch (e) {
      this.handleUnique(e);
    }
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    const count = await this.prisma.transaction.count({ where: { categoryId: id, userId } });
    if (count > 0) {
      throw new ConflictException('Esta categoria tem transações. Mova-as para outra categoria antes.');
    }
    await this.prisma.category.delete({ where: { id } });
  }

  private async ensureOwned(userId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, userId } });
    if (!cat) throw new NotFoundException('Categoria não encontrada');
  }

  private handleUnique(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ConflictException('Já existe uma categoria com esse nome');
    }
    throw e;
  }
}
