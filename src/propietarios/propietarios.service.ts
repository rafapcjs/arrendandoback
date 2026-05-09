import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Propietario } from './entities/propietario.entity';
import { CreatePropietarioDto } from './dto/create-propietario.dto';
import { UpdatePropietarioDto } from './dto/update-propietario.dto';
import { Role } from '../common/enums/roles.enum';

interface RequestUser {
  id: string;
  role: string;
  inmobiliariaId?: string | null;
}

@Injectable()
export class PropietariosService {
  constructor(
    @InjectRepository(Propietario)
    private readonly propietarioRepository: Repository<Propietario>,
  ) {}

  async create(dto: CreatePropietarioDto, user: RequestUser): Promise<Propietario> {
    const inmobiliariaId =
      user.role === Role.INMOBILIARIA ? user.inmobiliariaId : dto.inmobiliariaId;

    if (!inmobiliariaId) {
      throw new BadRequestException('Debe especificar inmobiliariaId');
    }

    const propietario = this.propietarioRepository.create({
      ...dto,
      inmobiliariaId,
    });

    return this.propietarioRepository.save(propietario);
  }

  async findAll(user: RequestUser): Promise<Propietario[]> {
    const where: any = user.role === Role.ADMIN
      ? {}
      : { inmobiliariaId: user.inmobiliariaId || 'no-access' };

    return this.propietarioRepository.find({
      where,
      relations: ['inmobiliaria'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: RequestUser): Promise<Propietario> {
    const propietario = await this.propietarioRepository.findOne({
      where: { id },
      relations: ['inmobiliaria'],
    });

    if (!propietario) {
      throw new NotFoundException(`Propietario con ID ${id} no encontrado`);
    }

    if (
      user.role === Role.INMOBILIARIA &&
      propietario.inmobiliariaId !== user.inmobiliariaId
    ) {
      throw new ForbiddenException('No tienes acceso a este propietario');
    }

    return propietario;
  }

  async update(id: string, dto: UpdatePropietarioDto, user: RequestUser): Promise<Propietario> {
    await this.findOne(id, user);
    await this.propietarioRepository.update(id, dto);
    return this.findOne(id, user);
  }

  async activate(id: string, isActive: boolean, user: RequestUser): Promise<Propietario> {
    await this.findOne(id, user);
    await this.propietarioRepository.update(id, { isActive });
    return this.findOne(id, user);
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const propietario = await this.findOne(id, user);
    await this.propietarioRepository.remove(propietario);
  }

  async findByInmobiliaria(inmobiliariaId: string): Promise<Propietario[]> {
    return this.propietarioRepository.find({
      where: { inmobiliariaId, isActive: true },
      order: { nombre: 'ASC' },
    });
  }
}
