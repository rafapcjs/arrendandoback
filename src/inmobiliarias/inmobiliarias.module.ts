import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inmobiliaria } from './entities/inmobiliaria.entity';
import { InmobiliariasService } from './inmobiliarias.service';
import { InmobiliariasController } from './inmobiliarias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inmobiliaria])],
  controllers: [InmobiliariasController],
  providers: [InmobiliariasService],
  exports: [InmobiliariasService, TypeOrmModule],
})
export class InmobiliariasModule {}
