import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { Inmobiliaria, InmobiliariaEstado } from '../inmobiliarias/entities/inmobiliaria.entity';
import { EmailService } from '../common/services/email.service';
import { JwtBlacklistService } from '../common/services/jwt-blacklist.service';
import { Role } from '../common/enums/roles.enum';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: any;
  let inmobiliariaRepository: any;
  let jwtService: any;
  let emailService: any;
  let jwtBlacklistService: any;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@example.com',
    password: 'hashedPassword123',
    role: Role.ADMIN,
    inmobiliariaId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockInmobiliaria = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    nombre: 'Test Inmobiliaria',
    estado: InmobiliariaEstado.ACTIVA,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Inmobiliaria),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendPasswordRecoveryEmail: jest.fn(),
          },
        },
        {
          provide: JwtBlacklistService,
          useValue: {
            addToBlacklist: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersRepository = module.get(getRepositoryToken(User));
    inmobiliariaRepository = module.get(getRepositoryToken(Inmobiliaria));
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
    jwtBlacklistService = module.get<JwtBlacklistService>(JwtBlacklistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'password123',
        role: Role.ADMIN,
      };

      usersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usersRepository.create.mockReturnValue({ ...createUserDto, password: 'hashedPassword123' });
      usersRepository.save.mockResolvedValue(mockUser);

      const result = await service.register(createUserDto);

      expect(result.message).toBe('User registered successfully');
      expect(result.user.email).toBe('juan@example.com');
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'juan@example.com' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'password123',
        role: Role.ADMIN,
      };

      usersRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(ConflictException);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'juan@example.com' } });
    });

    it('should throw BadRequestException if INMOBILIARIA role without inmobiliariaId', async () => {
      const createUserDto = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'password123',
        role: Role.INMOBILIARIA,
      };

      await expect(service.register(createUserDto)).rejects.toThrow(BadRequestException);
    });

    it('should register INMOBILIARIA user with inmobiliariaId', async () => {
      const createUserDto = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'password123',
        role: Role.INMOBILIARIA,
        inmobiliariaId: '550e8400-e29b-41d4-a716-446655440001',
      };

      const inmobiliariaUser = { ...mockUser, role: Role.INMOBILIARIA, inmobiliariaId: '550e8400-e29b-41d4-a716-446655440001' };

      usersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
      usersRepository.create.mockReturnValue({ ...createUserDto, password: 'hashedPassword123' });
      usersRepository.save.mockResolvedValue(inmobiliariaUser);

      const result = await service.register(createUserDto);

      expect(result.message).toBe('User registered successfully');
      expect(result.user.role).toBe(Role.INMOBILIARIA);
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginDto = { email: 'juan@example.com', password: 'password123' };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token123');

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('token123');
      expect(result.user.email).toBe('juan@example.com');
      expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'juan@example.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword123');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const loginDto = { email: 'nonexistent@example.com', password: 'password123' };

      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const loginDto = { email: 'juan@example.com', password: 'wrongpassword' };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const loginDto = { email: 'juan@example.com', password: 'password123' };
      const inactiveUser = { ...mockUser, isActive: false };

      usersRepository.findOne.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should include inmobiliariaId in JWT payload for INMOBILIARIA users', async () => {
      const loginDto = { email: 'juan@example.com', password: 'password123' };
      const inmobiliariaUser = { ...mockUser, role: Role.INMOBILIARIA, inmobiliariaId: '550e8400-e29b-41d4-a716-446655440001' };

      usersRepository.findOne.mockResolvedValue(inmobiliariaUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('token123');

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: 'juan@example.com',
        role: Role.INMOBILIARIA,
        inmobiliariaId: '550e8400-e29b-41d4-a716-446655440001',
      });
    });
  });

  describe('validateUser', () => {
    it('should return user if found and active', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id, isActive: true },
      });
    });

    it('should return null if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findAllUsers', () => {
    it('should return paginated users', async () => {
      const paginationDto = { page: 1, limit: 10 };
      const users = [mockUser];

      usersRepository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAllUsers(paginationDto);

      expect(result.data).toEqual(users);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should use default pagination values', async () => {
      const paginationDto = {};
      const users = [mockUser];

      usersRepository.findAndCount.mockResolvedValue([users, 1]);

      await service.findAllUsers(paginationDto);

      expect(usersRepository.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
        select: expect.arrayContaining(['id', 'email', 'role']),
      });
    });

    it('should calculate totalPages correctly', async () => {
      const paginationDto = { page: 2, limit: 5 };
      const users = Array(5).fill(mockUser);

      usersRepository.findAndCount.mockResolvedValue([users, 12]);

      const result = await service.findAllUsers(paginationDto);

      expect(result.totalPages).toBe(3);
    });
  });

  describe('findUserById', () => {
    it('should return user if found', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findUserById(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findUserById('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateUserDto = { firstName: 'Carlos' };
      const updatedUser = { ...mockUser, firstName: 'Carlos' };

      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.update.mockResolvedValue({ affected: 1 });
      usersRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(updatedUser);

      const result = await service.updateUser(mockUser.id, updateUserDto);

      expect(result.firstName).toBe('Carlos');
      expect(usersRepository.update).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateUserDto = { firstName: 'Carlos' };

      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.updateUser('nonexistent-id', updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('should hash password if provided in update', async () => {
      const updateUserDto = { password: 'newpassword123' };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      usersRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateUser(mockUser.id, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    });

    it('should throw ConflictException if new email already exists', async () => {
      const updateUserDto = { email: 'existing@example.com' };
      const existingUser = { ...mockUser, email: 'existing@example.com' };

      usersRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(existingUser);

      await expect(service.updateUser(mockUser.id, updateUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.remove.mockResolvedValue(mockUser);

      await service.deleteUser(mockUser.id);

      expect(usersRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      const activatedUser = { ...mockUser, isActive: true };

      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.update.mockResolvedValue({ affected: 1 });
      usersRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(activatedUser);

      const result = await service.activateUser(mockUser.id, true);

      expect(result.isActive).toBe(true);
      expect(usersRepository.update).toHaveBeenCalledWith(mockUser.id, { isActive: true });
    });

    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };

      usersRepository.findOne.mockResolvedValue(mockUser);
      usersRepository.update.mockResolvedValue({ affected: 1 });
      usersRepository.findOne.mockResolvedValueOnce(mockUser).mockResolvedValueOnce(deactivatedUser);

      const result = await service.activateUser(mockUser.id, false);

      expect(result.isActive).toBe(false);
    });

    it('should sync inmobiliaria state when activating INMOBILIARIA user', async () => {
      const inmobiliariaUser = { ...mockUser, role: Role.INMOBILIARIA, inmobiliariaId: mockInmobiliaria.id };

      usersRepository.findOne.mockResolvedValue(inmobiliariaUser);
      usersRepository.update.mockResolvedValue({ affected: 1 });
      inmobiliariaRepository.update.mockResolvedValue({ affected: 1 });
      usersRepository.findOne.mockResolvedValueOnce(inmobiliariaUser).mockResolvedValueOnce(inmobiliariaUser);

      await service.activateUser(inmobiliariaUser.id, true);

      expect(inmobiliariaRepository.update).toHaveBeenCalledWith(mockInmobiliaria.id, { estado: InmobiliariaEstado.ACTIVA });
    });

    it('should sync inmobiliaria state when deactivating INMOBILIARIA user', async () => {
      const inmobiliariaUser = { ...mockUser, role: Role.INMOBILIARIA, inmobiliariaId: mockInmobiliaria.id };

      usersRepository.findOne.mockResolvedValue(inmobiliariaUser);
      usersRepository.update.mockResolvedValue({ affected: 1 });
      inmobiliariaRepository.update.mockResolvedValue({ affected: 1 });
      usersRepository.findOne.mockResolvedValueOnce(inmobiliariaUser).mockResolvedValueOnce(inmobiliariaUser);

      await service.activateUser(inmobiliariaUser.id, false);

      expect(inmobiliariaRepository.update).toHaveBeenCalledWith(mockInmobiliaria.id, { estado: InmobiliariaEstado.INACTIVA });
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.activateUser('nonexistent-id', true)).rejects.toThrow(NotFoundException);
    });
  });

  describe('recoverPassword', () => {
    it('should send recovery email successfully', async () => {
      const passwordRecoveryDto = { email: 'juan@example.com' };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      usersRepository.update.mockResolvedValue({ affected: 1 });
      emailService.sendPasswordRecoveryEmail.mockResolvedValue(true);

      const result = await service.recoverPassword(passwordRecoveryDto);

      expect(result.message).toContain('exitosamente');
      expect(emailService.sendPasswordRecoveryEmail).toHaveBeenCalledWith('juan@example.com', expect.any(String));
    });

    it('should throw NotFoundException if user not found', async () => {
      const passwordRecoveryDto = { email: 'nonexistent@example.com' };

      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.recoverPassword(passwordRecoveryDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const passwordRecoveryDto = { email: 'juan@example.com' };
      const inactiveUser = { ...mockUser, isActive: false };

      usersRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.recoverPassword(passwordRecoveryDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedNewPassword');
      usersRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.changePassword(mockUser.id, changePasswordDto);

      expect(result.message).toContain('exitosamente');
      expect(usersRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const changePasswordDto = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword',
      };

      await expect(service.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const changePasswordDto = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.changePassword('nonexistent-id', changePasswordDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if new password is same as current', async () => {
      const changePasswordDto = {
        currentPassword: 'password123',
        newPassword: 'password123',
        confirmPassword: 'password123',
      };

      usersRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      await expect(service.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if account is inactive', async () => {
      const changePasswordDto = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };
      const inactiveUser = { ...mockUser, isActive: false };

      usersRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(service.changePassword(mockUser.id, changePasswordDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      usersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.logout(mockUser.id);

      expect(result.message).toBe('Sesión cerrada exitosamente');
      expect(jwtBlacklistService.addToBlacklist).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.logout('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
