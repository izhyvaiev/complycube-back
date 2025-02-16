import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Client, Person, VerificationSession } from '@app/database/models';
import { ModelCtor } from 'sequelize-typescript';
import { IndividualClientDto } from '@app/complycube-shared/verification/individual-client.dto';
import { plainToInstance } from 'class-transformer';
import { IndividualClientPayloadDto } from '@app/complycube-shared/verification/individual-client-payload.dto';
import { Transaction } from '@app/database/decorators/transaction.decorator';
import { isUndefined, omitBy, pick } from 'lodash';
import { ConfigService } from '@nestjs/config';
import { ComplyCube } from '@complycube/api';
import { ClientType } from '@app/complycube-shared/database/client-type';
import dayjs from 'dayjs';
import { ClientRequest } from '@complycube/api/dist/resources/Clients';
import { Token } from '@complycube/api/dist/resources/Tokens';

@Injectable()
export class VerificationService {
    private readonly complycube: ComplyCube
    constructor(
      @InjectModel(Client) private readonly clientModel: ModelCtor<Client>,
      @InjectModel(Person) private readonly personModel: ModelCtor<Person>,
      @InjectModel(VerificationSession) private readonly verificationSessionModel: ModelCtor<VerificationSession>,
      private readonly configService: ConfigService,
    ) {
      this.complycube = new ComplyCube({ apiKey: this.configService.get('complyCube') });
    }

    async getSessionClient(sessionId: string): Promise<IndividualClientDto | null> {
      const verificationSession = await this.getVerificationSessionWithClient(sessionId);
      return verificationSession ? this.mapClient(verificationSession.client!) : null;
    }

    async generateSessionToken(sessionId: string): Promise<Token | null> {
      const session = await this.getVerificationSessionWithClient(sessionId);
      if (!session) return null
      return this.complycube.token.generate(session.client!.externalId, {
        referrer: this.configService.get('web.domain')
      });
    }

    @Transaction()
    async setSessionClientData(sessionId: string, payload: IndividualClientPayloadDto): Promise<IndividualClientDto> {
      const { clientPayload, personPayload } = this.getClientPayload(payload);
      let verificationSession = await this.getVerificationSessionWithClient(sessionId);
      if (!verificationSession) {
        verificationSession = await this.verificationSessionModel.create({ uuid: sessionId });
        const client = await this.clientModel.create({
          verificationSessionId: verificationSession.id,
          ...clientPayload,
        })
        const person = await this.personModel.create({
          clientId: client.id,
          ...personPayload,
        })
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
         'gender', 'firstName', 'lastName', 'dateOfBirth', 'nationality',
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

    private mapClient(client: Client): IndividualClientDto {
      return plainToInstance(IndividualClientDto, {
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
      })
    }

    private mapClientRequest(client: Client, person: Person, isNew = false): ClientRequest {
      return {
        email: client.email,
        mobile: client.mobile,
        telephone: client.telephone,
        personDetails: omitBy({
          firstName: person.firstName,
          middleName: person.middleName,
          lastName: person.lastName,
          dob: person.dateOfBirth,
          gender: person.gender,
          nationality: person.nationality,
          birthCountry: person.birthCountry,
          ssn: person.socialSecurityNumber,
          socialInsuranceNumber: person.socialInsuranceNumber,
          nationalIdentityNumber: person.nationalIdentityNumber,
          taxIdentificationNumber: person.taxIdentificationNumber,
        }, isUndefined),
        externalId: client.id.toString(),
        ...(isNew ? {
          type: client.type,
          joinedDate: dayjs().format('YYYY-MM-DD'),
        } : {})
      }
    }
}