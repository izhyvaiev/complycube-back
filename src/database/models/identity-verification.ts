import { AutoIncrement, BelongsTo, Column, ForeignKey, PrimaryKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@app/database/base-model';
import { DataTypes } from 'sequelize';
import { VerificationSession } from '@app/database/models/verification-session';
import { VerificationType } from '@app/complycube-shared/database/verification-type';
import { VerificationOutcome } from '@app/complycube-shared/database/verification-outcome';
import { Client } from '@app/database/models/client';
import { Document } from '@app/database/models/document';

@Table({ tableName: 'identity_verifications' })
export class IdentityVerification extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column({ type: DataTypes.STRING })
  externalId: string | null

  @ForeignKey(() => VerificationSession)
  @Column
  verificationSessionId: number

  @BelongsTo(() => VerificationSession)
  verificationSession?: VerificationSession | null

  @Column({ type: DataTypes.ENUM, values: Object.values(VerificationType) })
  type: VerificationType

  @Column
  isProcessed: boolean

  @Column({ type: DataTypes.ENUM, values: Object.values(VerificationOutcome) })
  outcome: VerificationOutcome | null

  @ForeignKey(() => Client)
  @Column
  clientId: number

  @BelongsTo(() => Client)
  client?: Client | null

  @ForeignKey(() => Document)
  @Column
  documentId: number

  @BelongsTo(() => Document)
  document?: Document | null

  @Column({ type: DataTypes.STRING })
  livePhotoExternalId: string | null

  @Column(DataTypes.JSONB)
  breakdown: any
}