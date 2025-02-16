import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  Client,
  Person,
  VerificationSession,
  Document,
  Verification,
  DocumentType,
} from '@app/database/models';
import { BelongsTo, Column, ForeignKey, ModelCtor } from 'sequelize-typescript';
import { IndividualClientDto } from '@app/complycube-shared/verification/individual-client.dto';
import { IndividualClientPayloadDto } from '@app/complycube-shared/verification/individual-client-payload.dto';
import { Transaction } from '@app/database/decorators/transaction.decorator';
import { isNil, omitBy, pick } from 'lodash';
import { ConfigService } from '@nestjs/config';
import { ComplyCube } from '@complycube/api';
import { ClientType } from '@app/complycube-shared/database/client-type';
import * as dayjs from 'dayjs';
import { ClientRequest } from '@complycube/api/dist/resources/Clients';
import { Token } from '@complycube/api/dist/resources/Tokens';
import { CapturePayloadDto } from '@app/complycube-shared/verification/capture-payload.dto';
import { DocumentClassification } from '@app/complycube-shared/database/document-classification';
import { VerificationType } from '@app/complycube-shared/database/verification-type';
import { fillDto } from '@app/helpers';

@Injectable()
export class VerificationService {
    private readonly complycube: ComplyCube
    constructor(
      @InjectModel(Client) private readonly clientModel: ModelCtor<Client>,
      @InjectModel(Person) private readonly personModel: ModelCtor<Person>,
      @InjectModel(VerificationSession) private readonly verificationSessionModel: ModelCtor<VerificationSession>,
      @InjectModel(Document) private readonly documentModel: ModelCtor<Document>,
      @InjectModel(DocumentType) private readonly documentTypeModel: ModelCtor<DocumentType>,
      @InjectModel(Verification) private readonly verificationModel: ModelCtor<Verification>,
      private readonly configService: ConfigService,
    ) {
      this.complycube = new ComplyCube(this.configService.get('complyCube'));
    }

    async getSessionClient(sessionId: string): Promise<IndividualClientDto | null> {
      const verificationSession = await this.getVerificationSessionWithClient(sessionId);
      return verificationSession ? this.mapSession(verificationSession) : null;
    }

    async generateSessionToken(sessionId: string): Promise<Token | null> {
      const session = await this.getVerificationSessionWithClient(sessionId);
      if (!session) return null
      return this.complycube.token.generate(session.client!.externalId, {
        referrer: this.configService.get('web.domain')
      });
    }

  async getVerificationsBySessionId(sessionId: string): Promise<Verification[]> {
    const verificationSession = await this.getVerificationSessionWithClient(sessionId);
    if (!verificationSession) return []
    return this.verificationModel.findAll({
      where: { verificationSessionId: verificationSession.id }
    });
  }

  async checkVerificationStatus(sessionId: string, id: number): Promise<Verification> {
    const verification = await this.getVerification(sessionId, id)
    const check = await this.complycube.check.get(verification.externalId);
    const isProcessed = check.status === 'complete'
    await verification.update({
      isProcessed: isProcessed,
      outcome: isProcessed ? (check.result as any).outcome : null,
      breakdown:  isProcessed ? (check.result as any).breakdown : null,
    })
    return verification;
  }
  async getVerification(sessionId: string, id: number): Promise<Verification> {
    const verificationSession = await this.getVerificationSessionWithClient(sessionId);
    if (!verificationSession) {
      throw new NotFoundException('Verification not found');
    }
    const verification = await this.verificationModel.findOne({
      where: { verificationSessionId: verificationSession.id, id }
    });
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }
    return verification;
  }

    async initVerificationOfCapture(sessionId: string, payload: CapturePayloadDto) {
      const verificationSession = await this.getVerificationSessionWithClient(sessionId);
      if (!verificationSession) {
        throw new HttpException('Customer data needs to be provided before capture verification', 412)
      }
      const documentType = await this.documentTypeModel.findOne({where: {name: payload.documentType}})
      if (!documentType) {
        throw new BadRequestException('Invalid Document Type')
      }
      const document = await this.documentModel.create({
        externalId: payload.documentId,
        documentTypeId: documentType.id,
        classification: DocumentClassification.PROOF_OF_IDENTITY,
      })
      const documentCheck = await this.complycube.check.create(
        verificationSession.client!.externalId,
        {
          type: "document_check",
          documentId: payload.documentId
        }
      )
      const identityCheck = await this.complycube.check.create(
        verificationSession.client!.externalId,
        {
          livePhotoId: payload.livePhotoId,
          documentId: payload.documentId,
          type: "identity_check"
        }
      )
      return this.verificationModel.bulkCreate([
        {
          externalId: documentCheck.id,
          verificationSessionId: verificationSession.id,
          type: VerificationType.DOCUMENT_CHECK,
          isProcessed: false,
          clientId: verificationSession.client!.id,
          documentId: document.id,
        },
        {
          externalId: identityCheck.id,
          verificationSessionId: verificationSession.id,
          type: VerificationType.IDENTITY_CHECK,
          isProcessed: false,
          clientId: verificationSession.client!.id,
          documentId: document.id,
          livePhotoExternalId: payload.livePhotoId,
        },
      ])
    }

    @Transaction()
    async setSessionClientData(sessionId: string, payload: IndividualClientPayloadDto): Promise<IndividualClientDto> {
      const { clientPayload, personPayload } = this.getClientPayload(payload);
      let verificationSession = await this.getVerificationSessionWithClient(sessionId);
      if (!verificationSession) {
        const client = await this.clientModel.create(clientPayload)
        const person = await this.personModel.create({
          clientId: client.id,
          ...personPayload,
        })
        await this.verificationSessionModel.create({ uuid: sessionId, clientId: client.id });
        const complyCubeClient = await this.complycube.client.create(
          this.mapClientRequest(client, person, true)
        );
        await client.update({ externalId: complyCubeClient.id })
      } else {
        const client = verificationSession.client!
        const person = client.person!
        await client.update(clientPayload)
        await person.update(personPayload)
        await this.complycube.client.update(
          client.externalId,
          this.mapClientRequest(client, person)
        );
      }

      return this.getSessionClient(sessionId)
    }

    private getClientPayload(payload: IndividualClientPayloadDto): {
      clientPayload: Partial<Record<keyof Client, any>>,
      personPayload: Partial<Record<keyof Person, any>>
    } {
     return {
       clientPayload: {
         ...pick(payload, ['email', 'mobile', 'telephone']),
         type: ClientType.PERSON,
       },
       personPayload: pick(payload, [
         'gender', 'firstName', 'lastName', 'middleName', 'dateOfBirth', 'nationality',
         'birthCountry', 'socialSecurityNumber', 'socialInsuranceNumber',
         'nationalIdentityNumber', 'taxIdentificationNumber'
       ]),
      }
    }

    private async getVerificationSessionWithClient(sessionId: string): Promise<VerificationSession> {
      return this.verificationSessionModel.findOne({
        where: {
          uuid: sessionId,
        },
        include: {
          model: Client,
          as: 'client',
          include: [{
            model: Person,
            as: 'person',
          }]
        }
      })
    }

    private mapSession(session: VerificationSession): IndividualClientDto {
      const client = session.client!
      return fillDto(IndividualClientDto, {
        email: client.email,
        mobile: client.mobile,
        telephone: client.telephone,
        gender: client.person!.gender,
        firstName: client.person!.firstName,
        lastName: client.person!.lastName,
        dateOfBirth: client.person!.dateOfBirth,
        nationality: client.person!.nationality,
        birthCountry: client.person!.birthCountry,
        socialSecurityNumber: client.person!.socialSecurityNumber,
        socialInsuranceNumber: client.person!.socialInsuranceNumber,
        nationalIdentityNumber: client.person!.nationalIdentityNumber,
        taxIdentificationNumber: client.person!.taxIdentificationNumber,
        sessionId: session.uuid,
      })
    }

    private mapClientRequest(client: Client, person: Person, isNew = false): ClientRequest {
      const data = omitBy({
        email: client.email,
        mobile: client.mobile,
        telephone: client.telephone,
        personDetails: omitBy({
          firstName: person.firstName,
          middleName: person.middleName,
          lastName: person.lastName,
          dob: dayjs(person.dateOfBirth).format('YYYY-MM-DD'),
          gender: person.gender,
          nationality: person.nationality,
          birthCountry: person.birthCountry,
          ssn: person.socialSecurityNumber,
          socialInsuranceNumber: person.socialInsuranceNumber,
          nationalIdentityNumber: person.nationalIdentityNumber,
          taxIdentificationNumber: person.taxIdentificationNumber,
        }, isNil),
        externalId: client.id.toString(),
        ...(isNew ? {
          type: client.type,
          joinedDate: dayjs().format('YYYY-MM-DD'),
        } : {})
      }, isNil)
      return data
    }
}