import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedUserDto } from './dto/paginated-user.dto';
import { ActivateUserDto } from './dto/activate-user.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Authentication & Users')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      example: {
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@example.com',
        role: 'tenant',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already exists',
  })
  @ApiBody({ type: CreateUserDto })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan.perez@example.com',
          role: 'tenant',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiBody({ type: LoginDto })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        id: 1,
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan.perez@example.com',
        role: 'tenant',
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar todos los usuarios con paginación (Solo ADMIN)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página (default: 10, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios obtenida exitosamente',
    type: PaginatedUserDto,
  })
  findAllUsers(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedUserDto> {
    return this.authService.findAllUsers(paginationDto);
  }

  @Get('users/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtener usuario por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario obtenido exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  findUserById(@Param('id') id: string): Promise<User> {
    return this.authService.findUserById(id);
  }

  @Patch('users/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar usuario por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Usuario con este email ya existe',
  })
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.authService.updateUser(id, updateUserDto);
  }

  @Patch('users/:id/activate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Activar/desactivar usuario (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Estado del usuario actualizado exitosamente',
    type: User,
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  activateUser(
    @Param('id') id: string,
    @Body() activateUserDto: ActivateUserDto,
  ): Promise<User> {
    return this.authService.activateUser(id, activateUserDto.isActive);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar usuario por ID (Solo ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID del usuario' })
  @ApiResponse({
    status: 204,
    description: 'Usuario eliminado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  deleteUser(@Param('id') id: string): Promise<void> {
    return this.authService.deleteUser(id);
  }

  @ApiOperation({ summary: 'Recuperar contraseña de administrador' })
  @ApiResponse({
    status: 200,
    description: 'Nueva contraseña enviada al correo exitosamente',
    schema: {
      example: {
        message:
          'Nueva contraseña enviada exitosamente al correo electrónico registrado',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario administrador no encontrado',
  })
  @ApiResponse({
    status: 401,
    description: 'La cuenta está desactivada',
  })
  @ApiBody({ type: PasswordRecoveryDto })
  @Post('recover-password')
  async recoverPassword(@Body() passwordRecoveryDto: PasswordRecoveryDto) {
    return this.authService.recoverPassword(passwordRecoveryDto);
  }

  @ApiOperation({ summary: 'Cambiar contraseña del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente',
    schema: {
      example: {
        message: 'Contraseña actualizada exitosamente',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Contraseña actual incorrecta o no autorizado',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(AuthGuard('jwt'))
  @ApiBody({ type: ChangePasswordDto })
  @Patch('change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, changePasswordDto);
  }

  @ApiOperation({ summary: 'Cerrar sesión del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: {
        message: 'Sesión cerrada exitosamente. Elimine el token del cliente.',
      },
    },
  })
  @Post('logout')
  async logout() {
    return {
      message: 'Sesión cerrada exitosamente. Elimine el token del cliente.',
      instructions: [
        'Elimine el token JWT del almacenamiento local del cliente',
        'Redirija al usuario a la página de login',
        'El token dejará de ser válido automáticamente cuando expire',
      ],
    };
  }
}
