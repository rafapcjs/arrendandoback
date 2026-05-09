import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { InmobiliariasService } from './inmobiliarias.service';
import { InmobiliariasController } from './inmobiliarias.controller';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Inmobiliaria, User])],
  controllers: [InmobiliariasController],
  providers: [InmobiliariasService],
  exports: [InmobiliariasService, TypeOrmModule],
})
export class InmobiliariasModule {}
