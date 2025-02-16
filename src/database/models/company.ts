import { BaseModel } from '@app/database/base-model';
import { AutoIncrement, BelongsTo, Column, ForeignKey, PrimaryKey, Table } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import { Client } from '@app/database/models/client';
import { IncorporationType } from '@app/complycube-shared/database/incorporation-type';

@Table({ tableName: 'companies' })
export class Company extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @ForeignKey(() => Client)
  @Column
  clientId: number

  @BelongsTo(() => Client)
  client?: Client | null

  @Column
  name: string

  @Column({ type: DataTypes.STRING })
  website: string | null

  @Column({ type: DataTypes.STRING })
  registrationNumber: string | null

  @Column({ type: DataTypes.ENUM, values: Object.values(IncorporationType) })
  incorporationType: IncorporationType

  @Column
  incorporationCountry: string
}