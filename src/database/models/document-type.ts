import { BaseModel } from '@app/database/base-model';
import { AutoIncrement, Column, PrimaryKey, Table, HasMany } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import { ClientType } from '@app/complycube-shared/database/client-type';
import { DocumentClassification } from '@app/complycube-shared/database/document-classification';
import { Document } from '@app/database/models/document';

@Table({ tableName: 'document_types' })
export class DocumentType extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column
  name: string

  @Column({ type: DataTypes.ENUM, values: Object.values(ClientType) })
  clientType: ClientType | null

  @Column({ type: DataTypes.ARRAY(
    DataTypes.ENUM({values: Object.values(DocumentClassification)})
  )})
  compatibleClassifications: DocumentClassification[]

  @HasMany(() => Document)
  documents?: Document[]
}