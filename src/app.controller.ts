import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('General')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'API is running successfully',
    schema: {
      type: 'string',
      example: 'Hello World!'
    }
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
