import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { getModelToken } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Client, Document, DocumentType, Person, Verification, VerificationSession } from '../database/models';
import { Sequelize } from 'sequelize-typescript';
jest.mock('@complycube/api', () => {
  return {
    ComplyCube: jest.fn().mockImplementation(() => ({
      webhook: {
        list: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      token: {
        generate: jest.fn(),
      },
      check: {
        get: jest.fn(),
        create: jest.fn(),
      },
      client: {
        create: jest.fn(),
        update: jest.fn(),
      },
    })),
  };
});
let testModule: TestingModule;
describe('VerificationService', () => {
  let service: VerificationService;
  let mockConfigService: ConfigService;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: getModelToken(Client),
          useValue: jest.fn(),
        },
        {
          provide: getModelToken(Person),
          useValue: jest.fn(),
        },
        {
          provide: getModelToken(VerificationSession),
          useValue: jest.fn(),
        },
        {
          provide: getModelToken(Document),
          useValue: jest.fn(),
        },
        {
          provide: getModelToken(DocumentType),
          useValue: jest.fn(),
        },
        {
          provide: getModelToken(Verification),
          useValue: jest.fn(),
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: Symbol.for('@Transaction.database'),
          useValue: {},
        },
        {
          provide: Sequelize,
          useValue: {},
        },
        {
          provide: "CLS_NAMESPACE",
          useValue: {}
        }
      ],

    }).compile();

    service = testModule.get<VerificationService>(VerificationService);
    mockConfigService = testModule.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should ensure webhook is created and enabled', async () => {
      const mockComplyCube = (service as any).complycube;
      mockComplyCube.webhook.list.mockResolvedValue([
        { url: 'http://webhook.url', enabled: false, id: 'webhook-id' },
      ]);
      mockConfigService.get = jest.fn().mockReturnValue('http://webhook.url');

      await service.onModuleInit();

      expect(mockComplyCube.webhook.update).toHaveBeenCalledWith('webhook-id', {
        enabled: true,
      });
    });
  });

  describe('getSessionClient', () => {
    it('should return session client data if session exists', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue({
        client: { email: 'test@example.com', person: { firstName: 'John', lastName: 'Doe' } },
        uuid: 'session-id',
      });
      const result = await service.getSessionClient('session-id');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should return null if session does not exist', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue(null);
      const result = await service.getSessionClient('session-id');
      expect(result).toBeNull();
    });
  });

  describe('generateSessionToken', () => {
    it('should generate session token when session exists', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue({
        client: { externalId: 'external-client-id' },
      });
      const mockComplyCube = (service as any).complycube;
      mockComplyCube.token.generate.mockResolvedValue({ token: 'generated-token' });

      const result = await service.generateSessionToken('session-id');

      expect(mockComplyCube.token.generate).toHaveBeenCalledWith('external-client-id', {
        referrer: undefined,
      });
      expect(result).toHaveProperty('token', 'generated-token');
    });

    it('should return null when session does not exist', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue(null);

      const result = await service.generateSessionToken('session-id');

      expect(result).toBeNull();
    });
  });

  describe('getVerification', () => {
    it('should return a verification if it exists', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue({
        id: 1,
      });
      const mockVerificationModel = testModule.get(getModelToken(Verification));
      mockVerificationModel.findOne = jest.fn().mockResolvedValue({
        id: 1,
      });

      const result = await service.getVerification('session-id', 1);

      expect(result).toHaveProperty('id', 1);
    });

    it('should throw NotFoundException if verification does not exist', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue({
        id: 1,
      });
      const mockVerificationModel = testModule.get(getModelToken(Verification));
      mockVerificationModel.findOne = jest.fn().mockResolvedValue(null);

      await expect(service.getVerification('session-id', 1)).rejects.toThrow('Verification not found');
    });

    it('should throw NotFoundException if session does not exist', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue(null);

      await expect(service.getVerification('session-id', 1)).rejects.toThrow('Verification not found');
    });
  });

  describe('initVerificationOfCapture', () => {
    it('should initialize verification of capture', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue({
        id: 1,
        client: { externalId: 'external-client-id' },
      });
      const mockDocumentTypeModel = testModule.get(getModelToken(DocumentType));
      mockDocumentTypeModel.findOne = jest.fn().mockResolvedValue({ id: 1 });

      const mockDocumentModel = testModule.get(getModelToken(Document));
      mockDocumentModel.create = jest.fn().mockResolvedValue({ id: 1 });

      const mockComplyCube = (service as any).complycube;
      mockComplyCube.check.create.mockResolvedValueOnce({ id: 'doc-check-id' });
      mockComplyCube.check.create.mockResolvedValueOnce({ id: 'identity-check-id' });

      const mockVerificationModel = testModule.get(getModelToken(Verification));
      mockVerificationModel.bulkCreate = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const payload = { documentId: 'doc-id', documentType: 'passport', livePhotoId: 'photo-id' };
      const result = await service.initVerificationOfCapture('session-id', payload);

      expect(result).toHaveLength(2);
    });

    it('should throw an HttpException if session does not exist', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue(null);

      const payload = { documentId: 'doc-id', documentType: 'passport', livePhotoId: 'photo-id' };

      await expect(service.initVerificationOfCapture('session-id', payload)).rejects.toThrow(
        'Customer data needs to be provided before capture verification',
      );
    });

    it('should throw a BadRequestException if document type is invalid', async () => {
      jest.spyOn(service as any, 'getVerificationSessionWithClient').mockResolvedValue({
        id: 1,
        client: { externalId: 'external-client-id' },
      });
      const mockDocumentTypeModel = testModule.get(getModelToken(DocumentType));
      mockDocumentTypeModel.findOne = jest.fn().mockResolvedValue(null);

      const payload = { documentId: 'doc-id', documentType: 'invalid', livePhotoId: 'photo-id' };

      await expect(service.initVerificationOfCapture('session-id', payload)).rejects.toThrow(
        'Invalid Document Type',
      );
    });
  });
});