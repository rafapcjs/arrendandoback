import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratosService } from './contratos.service';
import { ContratosController } from './contratos.controller';
import { Contrato } from './entities/contrato.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';
import { PagosModule } from '../pagos/pagos.module';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contrato, Tenant, Property]),
    forwardRef(() => PagosModule),
  ],
  controllers: [ContratosController],
  providers: [ContratosService, CloudinaryService],
  exports: [ContratosService],
})
export class ContratosModule {}
