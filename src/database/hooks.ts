import type Sequelize from 'sequelize'
import { BIGINT, DATE, DECIMAL } from '@app/database/data-types'

export function afterConnect() {
  ;(this as any as Sequelize.Sequelize).connectionManager.refreshTypeParser({
    DECIMAL,
    BIGINT,
    DATE,
  })
}