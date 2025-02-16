import { Module } from '@nestjs/common';
import { VerificationService } from '@app/verification/verification.service';
import { VerificationController } from '@app/verification/verification.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import {
  Client,
  Document,
  DocumentType,
  Verification,
  Person,
  VerificationSession,
} from '@app/database/models';

@Module({
  imports: [SequelizeModule.forFeature([
    VerificationSession, Client, Person, Document, Verification,
    DocumentType
  ])],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}