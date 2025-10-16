import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratosService } from './contratos.service';
import { ContratosController } from './contratos.controller';
import { Contrato } from './entities/contrato.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contrato, Tenant, Property])],
  controllers: [ContratosController],
  providers: [ContratosService],
  exports: [ContratosService],
})
export class ContratosModule {}