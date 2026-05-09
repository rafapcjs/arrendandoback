import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inmobiliaria, InmobiliariaEstado } from './entities/inmobiliaria.entity';
import { CreateInmobiliariaDto } from './dto/create-inmobiliaria.dto';
import { UpdateInmobiliariaDto } from './dto/update-inmobiliaria.dto';
import { Role } from '../common/enums/roles.enum';

@Injectable()
export class InmobiliariasService {
  constructor(
    @InjectRepository(Inmobiliaria)
    private readonly inmobiliariaRepository: Repository<Inmobiliaria>,
  ) {}

  async create(dto: CreateInmobiliariaDto, userId: string): Promise<Inmobiliaria> {
    const existingNit = await this.inmobiliariaRepository.findOne({
      where: { nit: dto.nit },
    });
    if (existingNit) {
      throw new ConflictException('Ya existe una inmobiliaria con este NIT');
    }

    const existingEmail = await this.inmobiliariaRepository.findOne({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Ya existe una inmobiliaria con este email');
    }

    const inmobiliaria = this.inmobiliariaRepository.create({
      ...dto,
      creadoPorId: userId,
    });

    return this.inmobiliariaRepository.save(inmobiliaria);
  }

  async findAll(): Promise<Inmobiliaria[]> {
    return this.inmobiliariaRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Inmobiliaria> {
    const inmobiliaria = await this.inmobiliariaRepository.findOne({
      where: { id },
    });

    if (!inmobiliaria) {
      throw new NotFoundException(`Inmobiliaria con ID ${id} no encontrada`);
    }

    return inmobiliaria;
  }

  async findOneForUser(id: string, user: { role: string; inmobiliariaId?: string }): Promise<Inmobiliaria> {
    const inmobiliaria = await this.findOne(id);

    if (user.role === Role.INMOBILIARIA && inmobiliaria.id !== user.inmobiliariaId) {
      throw new ForbiddenException('No tienes acceso a esta inmobiliaria');
    }

    return inmobiliaria;
  }

  async update(id: string, dto: UpdateInmobiliariaDto): Promise<Inmobiliaria> {
    const inmobiliaria = await this.findOne(id);

    if (dto.nit && dto.nit !== inmobiliaria.nit) {
      const existing = await this.inmobiliariaRepository.findOne({
        where: { nit: dto.nit },
      });
      if (existing) {
        throw new ConflictException('Ya existe una inmobiliaria con este NIT');
      }
    }

    if (dto.email && dto.email !== inmobiliaria.email) {
      const existing = await this.inmobiliariaRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Ya existe una inmobiliaria con este email');
      }
    }

    await this.inmobiliariaRepository.update(id, dto);
    return this.findOne(id);
  }

  async toggleEstado(id: string): Promise<Inmobiliaria> {
    const inmobiliaria = await this.findOne(id);
    const nuevoEstado =
      inmobiliaria.estado === InmobiliariaEstado.ACTIVA
        ? InmobiliariaEstado.INACTIVA
        : InmobiliariaEstado.ACTIVA;

    await this.inmobiliariaRepository.update(id, { estado: nuevoEstado });
    return this.findOne(id);
  }
}
