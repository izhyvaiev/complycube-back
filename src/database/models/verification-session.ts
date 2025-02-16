import { AutoIncrement, BelongsTo, Column, ForeignKey, HasMany, PrimaryKey, Table } from 'sequelize-typescript';
import { BaseModel } from '@app/database/base-model';
import { DataTypes } from 'sequelize';
import { Client } from '@app/database/models/client';
import { Verification } from '@app/database/models/verification';

@Table({ tableName: 'verification_sessions' })
export class VerificationSession extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column(DataTypes.UUID)
  uuid: string

  @ForeignKey(() => Client)
  @Column
  clientId: number

  @BelongsTo(() => Client)
  client?: Client | null

  @HasMany(() => Verification)
  verifications?: Verification[]
}