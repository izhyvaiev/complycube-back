import { Column, Model, Table } from 'sequelize-typescript'

@Table({ paranoid: true })
export abstract class BaseModel<
  TModelAttributes extends NonNullable<unknown> = any,
  TCreationAttributes extends NonNullable<unknown> = TModelAttributes,
> extends Model<TModelAttributes, TCreationAttributes> {

  @Column
  createdAt: Date | null

  @Column
  updatedAt: Date | null

  @Column
  deletedAt: Date | null
}
