import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DashboardController } from './controllers/dashboard.controller';
import { ContactController } from './controllers/contact.controller';
import { DashboardService } from './services/dashboard.service';
import { EmailService } from './services/email.service';
import { User } from '../auth/entities/user.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Property } from '../properties/entities/property.entity';
import { Contrato } from '../contratos/entities/contrato.entity';
import { Pago } from '../pagos/entities/pago.entity';
import { Inmobiliaria } from '../inmobiliarias/entities/inmobiliaria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tenant, Property, Contrato, Pago, Inmobiliaria]),
    ConfigModule,
  ],
  controllers: [DashboardController, ContactController],
  providers: [DashboardService, EmailService],
  exports: [DashboardService, EmailService],
})
export class CommonModule {}
