import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Contrato } from '../contratos/entities/contrato.entity';
import { Pago, PagoEstado } from '../pagos/entities/pago.entity';
import { EmailService } from '../common/services/email.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let pagoRepository: Repository<Pago>;
  let contratoRepository: Repository<Contrato>;
  let emailService: EmailService;

  const mockPago = {
    id: '1',
    montoTotal: 1000000,
    fechaPagoEsperada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    estado: PagoEstado.PENDIENTE,
    contrato: {
      id: '1',
      inmueble: {
        direccion: 'Calle 123 #456',
      },
      inquilino: {
        id: '1',
        nombres: 'Juan Pérez',
        correo: 'juan@example.com',
      },
      canonMensual: 1000000,
      fechaInicio: new Date('2024-01-01'),
      fechaFin: new Date('2025-01-01'),
      estado: 'ACTIVO',
    },
  } as any;

  const mockContrato = {
    id: '1',
    estado: 'ACTIVO',
    canonMensual: 1000000,
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000),
    inmueble: {
      direccion: 'Calle 123 #456',
    },
    inquilino: {
      id: '1',
      nombres: 'Juan Pérez',
      correo: 'juan@example.com',
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Pago),
          useValue: {
            createQueryBuilder: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Contrato),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    pagoRepository = module.get<Repository<Pago>>(getRepositoryToken(Pago));
    contratoRepository = module.get<Repository<Contrato>>(
      getRepositoryToken(Contrato),
    );
    emailService = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendPaymentReminder', () => {
    it('should send payment reminder email', async () => {
      const sendEmailSpy = jest
        .spyOn(emailService, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendPaymentReminder(mockPago);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        'juan@example.com',
        '💰 Recordatorio de Pago - Arrendando',
        expect.stringContaining('Juan Pérez'),
      );
    });

    it('should handle email sending error gracefully', async () => {
      const sendEmailSpy = jest
        .spyOn(emailService, 'sendEmail')
        .mockRejectedValue(new Error('Email service failed'));

      await expect(
        service.sendPaymentReminder(mockPago),
      ).resolves.not.toThrow();

      expect(sendEmailSpy).toHaveBeenCalled();
    });

    it('should include payment amount in template', async () => {
      jest
        .spyOn(emailService, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendPaymentReminder(mockPago);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('1.000.000'),
      );
    });
  });

  describe('sendContractExpirationReminder', () => {
    it('should send contract expiration reminder email', async () => {
      const sendEmailSpy = jest
        .spyOn(emailService, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendContractExpirationReminder(mockContrato);

      expect(sendEmailSpy).toHaveBeenCalledWith(
        'juan@example.com',
        '📄 Recordatorio de Vencimiento de Contrato - Arrendando',
        expect.stringContaining('Juan Pérez'),
      );
    });

    it('should handle email sending error gracefully', async () => {
      jest
        .spyOn(emailService, 'sendEmail')
        .mockRejectedValue(new Error('Email service failed'));

      await expect(
        service.sendContractExpirationReminder(mockContrato),
      ).resolves.not.toThrow();
    });

    it('should include property address in template', async () => {
      jest
        .spyOn(emailService, 'sendEmail')
        .mockResolvedValue(undefined);

      await service.sendContractExpirationReminder(mockContrato);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('Calle 123 #456'),
      );
    });
  });

  describe('sendManualPaymentReminder', () => {
    it('should send manual payment reminder when pago exists', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockPago),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(service, 'sendPaymentReminder')
        .mockResolvedValue(undefined);

      await service.sendManualPaymentReminder('1');

      expect(pagoRepository.createQueryBuilder).toHaveBeenCalledWith('pago');
      expect(service.sendPaymentReminder).toHaveBeenCalledWith(mockPago);
    });

    it('should not send reminder if pago not found', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(service, 'sendPaymentReminder')
        .mockResolvedValue(undefined);

      await service.sendManualPaymentReminder('invalid-id');

      expect(service.sendPaymentReminder).not.toHaveBeenCalled();
    });
  });

  describe('sendManualContractExpirationReminder', () => {
    it('should send manual contract expiration reminder when contrato exists', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockContrato),
      };

      jest
        .spyOn(contratoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(service, 'sendContractExpirationReminder')
        .mockResolvedValue(undefined);

      await service.sendManualContractExpirationReminder('1');

      expect(contratoRepository.createQueryBuilder).toHaveBeenCalledWith(
        'contrato',
      );
      expect(service.sendContractExpirationReminder).toHaveBeenCalledWith(
        mockContrato,
      );
    });

    it('should not send reminder if contrato not found', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(contratoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(service, 'sendContractExpirationReminder')
        .mockResolvedValue(undefined);

      await service.sendManualContractExpirationReminder('invalid-id');

      expect(service.sendContractExpirationReminder).not.toHaveBeenCalled();
    });
  });

  describe('checkPaymentReminders (Cron)', () => {
    it('should find and send reminders for payments due in 2 days', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPago]),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(service, 'sendPaymentReminder')
        .mockResolvedValue(undefined);

      await service.checkPaymentReminders();

      expect(pagoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(service.sendPaymentReminder).toHaveBeenCalledWith(mockPago);
    });

    it('should handle errors during cron job', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      await expect(
        service.checkPaymentReminders(),
      ).resolves.not.toThrow();
    });
  });

  describe('checkContractExpirations (Cron)', () => {
    it('should find and send reminders for contracts expiring in 3 months', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockContrato]),
      };

      jest
        .spyOn(contratoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(service, 'sendContractExpirationReminder')
        .mockResolvedValue(undefined);

      await service.checkContractExpirations();

      expect(contratoRepository.createQueryBuilder).toHaveBeenCalled();
      expect(service.sendContractExpirationReminder).toHaveBeenCalledWith(
        mockContrato,
      );
    });

    it('should handle errors during cron job', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      jest
        .spyOn(contratoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      await expect(
        service.checkContractExpirations(),
      ).resolves.not.toThrow();
    });
  });

  describe('checkOverduePayments (Cron)', () => {
    it('should find and update overdue payments', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPago]),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(pagoRepository, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      await service.checkOverduePayments();

      expect(pagoRepository.update).toHaveBeenCalledWith(mockPago.id, {
        estado: PagoEstado.VENCIDO,
      });
    });

    it('should handle errors during cron job', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockRejectedValue(new Error('Database error')),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      await expect(
        service.checkOverduePayments(),
      ).resolves.not.toThrow();
    });

    it('should not update if no overdue payments found', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(pagoRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      jest
        .spyOn(pagoRepository, 'update')
        .mockResolvedValue({ affected: 0 } as any);

      await service.checkOverduePayments();

      expect(pagoRepository.update).not.toHaveBeenCalled();
    });
  });
});
