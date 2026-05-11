import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { PaginationDto } from './dto/pagination.dto';
import { PasswordRecoveryDto } from './dto/password-recovery.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ActivateUserDto } from './dto/activate-user.dto';
import { Role } from '../common/enums/roles.enum';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            findAllUsers: jest.fn(),
            findUserById: jest.fn(),
            updateUser: jest.fn(),
            deleteUser: jest.fn(),
            activateUser: jest.fn(),
            recoverPassword: jest.fn(),
            changePassword: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'Juan',
        lastName: 'Pérez',
        email: 'juan@example.com',
        password: 'password123',
        role: Role.ADMIN,
      };

      const expectedResponse = {
        message: 'User registered successfully',
        user: {
          id: mockUser.id,
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@example.com',
          role: Role.ADMIN,
        },
      };

      authService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(createUserDto);

      expect(result.message).toBe('User registered successfully');
      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    it('should login user and return access token', async () => {
      const loginDto: LoginDto = {
        email: 'juan@example.com',
        password: 'password123',
      };

      const expectedResponse = {
        access_token: 'token123',
        user: {
          id: mockUser.id,
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@example.com',
          role: Role.ADMIN,
          inmobiliariaId: null,
        },
      };

      authService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(result.access_token).toBe('token123');
      expect(result.user.email).toBe('juan@example.com');
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', () => {
      const mockRequest = {
        user: {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          inmobiliariaId: null,
        },
      };

      const result = controller.getProfile(mockRequest);

      expect(result.email).toBe(mockUser.email);
      expect(result.role).toBe(mockUser.role);
    });
  });

  describe('findAllUsers', () => {
    it('should return paginated users', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };

      const expectedResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      authService.findAllUsers.mockResolvedValue(expectedResponse);

      const result = await controller.findAllUsers(paginationDto);

      expect(result.data).toEqual([mockUser]);
      expect(result.total).toBe(1);
      expect(authService.findAllUsers).toHaveBeenCalledWith(paginationDto);
    });

    it('should handle pagination with custom page and limit', async () => {
      const paginationDto: PaginationDto = { page: 2, limit: 5 };

      const expectedResponse = {
        data: Array(5).fill(mockUser),
        total: 12,
        page: 2,
        limit: 5,
        totalPages: 3,
      };

      authService.findAllUsers.mockResolvedValue(expectedResponse);

      const result = await controller.findAllUsers(paginationDto);

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
      expect(authService.findAllUsers).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findUserById', () => {
    it('should return user by ID', async () => {
      authService.findUserById.mockResolvedValue(mockUser);

      const result = await controller.findUserById(mockUser.id);

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(authService.findUserById).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Carlos',
      };

      const updatedUser = { ...mockUser, firstName: 'Carlos' };
      authService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(mockUser.id, updateUserDto);

      expect(result.firstName).toBe('Carlos');
      expect(authService.updateUser).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });
  });

  describe('deleteUser', () => {
    it('should delete user by ID', async () => {
      authService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser(mockUser.id);

      expect(authService.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('activateUser', () => {
    it('should activate user', async () => {
      const activateUserDto: ActivateUserDto = { isActive: true };
      const activatedUser = { ...mockUser, isActive: true };

      authService.activateUser.mockResolvedValue(activatedUser);

      const result = await controller.activateUser(mockUser.id, activateUserDto);

      expect(result.isActive).toBe(true);
      expect(authService.activateUser).toHaveBeenCalledWith(mockUser.id, true);
    });

    it('should deactivate user', async () => {
      const activateUserDto: ActivateUserDto = { isActive: false };
      const deactivatedUser = { ...mockUser, isActive: false };

      authService.activateUser.mockResolvedValue(deactivatedUser);

      const result = await controller.activateUser(mockUser.id, activateUserDto);

      expect(result.isActive).toBe(false);
      expect(authService.activateUser).toHaveBeenCalledWith(mockUser.id, false);
    });
  });

  describe('recoverPassword', () => {
    it('should send password recovery email', async () => {
      const passwordRecoveryDto: PasswordRecoveryDto = {
        email: 'juan@example.com',
      };

      const expectedResponse = {
        message: 'Nueva contraseña enviada exitosamente al correo electrónico registrado',
      };

      authService.recoverPassword.mockResolvedValue(expectedResponse);

      const result = await controller.recoverPassword(passwordRecoveryDto);

      expect(result.message).toContain('Nueva contraseña');
      expect(authService.recoverPassword).toHaveBeenCalledWith(passwordRecoveryDto);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const changePasswordDto: ChangePasswordDto = {
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      const mockRequest = { user: { sub: mockUser.id } };

      const expectedResponse = {
        message: 'Contraseña actualizada exitosamente',
      };

      authService.changePassword.mockResolvedValue(expectedResponse);

      const result = await controller.changePassword(mockRequest, changePasswordDto);

      expect(result.message).toContain('exitosamente');
      expect(authService.changePassword).toHaveBeenCalledWith(mockUser.id, changePasswordDto);
    });
  });

  describe('logout', () => {
    it('should logout user and return message with instructions', async () => {
      const result = await controller.logout();

      expect(result.message).toContain('Sesión cerrada exitosamente');
      expect(result.instructions).toBeDefined();
      expect(Array.isArray(result.instructions)).toBe(true);
      expect(result.instructions.length).toBeGreaterThan(0);
    });

    it('should include cleanup instructions for client', async () => {
      const result = await controller.logout();

      const hasTokenInstruction = result.instructions.some((instr: string) => instr.includes('token'));
      const hasLoginInstruction = result.instructions.some((instr: string) => instr.includes('login'));

      expect(hasTokenInstruction).toBe(true);
      expect(hasLoginInstruction).toBe(true);
    });
  });
});
