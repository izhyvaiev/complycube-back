import { BaseModel } from '@app/database/base-model';
import { AutoIncrement, Column, PrimaryKey, Table } from 'sequelize-typescript';

@Table({ tableName: 'refresh_tokens' })
export class RefreshToken extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column
  token: string

  @Column
  sessionId: string

  @Column
  expiresAt: Date
}