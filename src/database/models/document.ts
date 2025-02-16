import { BaseModel } from '@app/database/base-model';
import { AutoIncrement, BelongsTo, Column, ForeignKey, PrimaryKey, Table, HasMany } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import { DocumentType } from '@app/database/models/document-type';
import { DocumentClassification } from '@app/complycube-shared/database/document-classification';
import { Verification } from '@app/database/models/verification';

@Table({ tableName: 'documents' })
export class Document extends BaseModel {
  @AutoIncrement
  @PrimaryKey
  @Column
  id: number

  @Column({ type: DataTypes.STRING })
  externalId: string | null

  @ForeignKey(() => DocumentType)
  @Column
  documentTypeId: number

  @BelongsTo(() => DocumentType)
  documentType?: DocumentType | null

  @Column({ type: DataTypes.ENUM, values: Object.values(DocumentClassification) })
  classification: DocumentClassification

  @Column
  issuingCountry: string | null

  @HasMany(() => Verification)
  identityVerifications?: Verification[]
}