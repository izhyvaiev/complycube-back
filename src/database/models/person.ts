import { BaseModel } from '@app/database/base-model';
import { BelongsTo, AutoIncrement, Column, ForeignKey, PrimaryKey, Table } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import { PersonGender } from '@app/complycube-shared/database/person-gender';
import { Client } from '@app/database/models/client';

@Table({ tableName: 'persons' })
export class Person extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column({ type: DataTypes.ENUM, values: Object.values(PersonGender) })
  gender: PersonGender

  @ForeignKey(() => Client)
  @Column
  clientId: number

  @BelongsTo(() => Client)
  client?: Client | null;

  @Column
  firstName: string

  @Column
  lastName: string

  @Column
  middleName: string

  @Column
  dateOfBirth: string

  @Column
  nationality: string

  @Column
  birthCountry: string

  @Column({ type: DataTypes.STRING })
  socialSecurityNumber: string | null;

  @Column({ type: DataTypes.STRING })
  socialInsuranceNumber: string | null;

  @Column({ type: DataTypes.STRING })
  nationalIdentityNumber: string | null;

  @Column({ type: DataTypes.STRING })
  taxIdentificationNumber: string | null;
}