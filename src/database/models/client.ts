import { BaseModel } from '@app/database/base-model';
import { AutoIncrement, Column, HasOne, PrimaryKey, Table } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import { ClientType } from '@app/complycube-shared/database/client-type';
import { Person } from '@app/database/models/person';
import { Company } from '@app/database/models/company';

@Table({ tableName: 'clients' })
export class Client extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column({ type: DataTypes.STRING })
  externalId: string | null;

  @Column({ type: DataTypes.ENUM, values: Object.values(ClientType) })
  type: ClientType;

  @Column
  email: string;

  @Column({ type: DataTypes.STRING })
  mobile: string | null;

  @Column({ type: DataTypes.STRING })
  telephone: string | null;

  @HasOne(() => Person)
  person?: Person | null;

  @HasOne(() => Company)
  company?: Company | null;
}