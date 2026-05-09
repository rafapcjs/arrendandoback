import { PartialType } from '@nestjs/swagger';
import { CreateInmobiliariaDto } from './create-inmobiliaria.dto';

export class UpdateInmobiliariaDto extends PartialType(CreateInmobiliariaDto) {}
