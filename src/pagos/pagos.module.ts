import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { PagosCron } from './pagos.cron';
import { Pago } from './entities/pago.entity';
import { Contrato } from '../contratos/entities/contrato.entity';
import { ContratosModule } from '../contratos/contratos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pago, Contrato]),
    ScheduleModule.forRoot(),
    forwardRef(() => ContratosModule),
  ],
  controllers: [PagosController],
  providers: [PagosService, PagosCron],
  exports: [PagosService],
})
export class PagosModule {}
