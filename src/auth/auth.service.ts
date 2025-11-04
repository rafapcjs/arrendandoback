import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PaginatedUserDto } from './dto/paginated-user.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../common/services/email.service';
import { PasswordGenerator } from '../common/utils/password-generator.util';
import { JwtBlacklistService } from '../common/services/jwt-blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private jwtBlacklistService: JwtBlacklistService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || 'ADMIN',
    });

    const savedUser = await this.usersRepository.save(user);

    return {
      message: 'User registered successfully',
      user: {
        id: savedUser.id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    return user;
  }

  async findAllUsers(paginationDto: PaginationDto): Promise<PaginatedUserDto> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.usersRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findUserById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'firstName',
        'lastName',
        'email',
        'role',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findUserById(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.usersRepository.update(id, updateUserDto);
    return this.findUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findUserById(id);
    await this.usersRepository.remove(user);
  }

  async activateUser(id: string, isActive: boolean): Promise<User> {
    const user = await this.findUserById(id);
    await this.usersRepository.update(id, { isActive });
    return this.findUserById(id);
  }

  async recoverPassword(
    passwordRecoveryDto: PasswordRecoveryDto,
  ): Promise<{ message: string }> {
    const { email } = passwordRecoveryDto;

    const user = await this.usersRepository.findOne({
      where: { email, role: 'ADMIN' },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuario administrador no encontrado con este email',
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'La cuenta está desactivada. Contacte al soporte técnico',
      );
    }

    const newPassword = PasswordGenerator.generateUniquePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.usersRepository.update(user.id, {
      password: hashedPassword,
      updatedAt: new Date(),
    });

    await this.emailService.sendPasswordRecoveryEmail(email, newPassword);

    return {
      message:
        'Nueva contraseña enviada exitosamente al correo electrónico registrado',
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'La nueva contraseña y su confirmación no coinciden',
      );
    }

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la actual',
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await this.usersRepository.update(userId, {
      password: hashedNewPassword,
      updatedAt: new Date(),
    });

    return {
      message: 'Contraseña actualizada exitosamente',
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Generar un identificador único para el token actual
    // En un sistema real, podrías usar el jti (JWT ID) del token
    const tokenId = `${userId}-${Date.now()}`;

    // Agregar el token a la lista negra
    this.jwtBlacklistService.addToBlacklist(tokenId);

    return {
      message: 'Sesión cerrada exitosamente',
    };
  }
}
