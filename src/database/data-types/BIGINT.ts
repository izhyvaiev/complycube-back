import Sequelize from 'sequelize'

// @ts-ignore
export class BIGINT extends Sequelize.DataTypes.BIGINT {
	static parse(value: string) {
		return parseInt(value)
	}
}
