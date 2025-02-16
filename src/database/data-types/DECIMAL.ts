import Sequelize from 'sequelize'

// @ts-ignore
export class DECIMAL extends Sequelize.DataTypes.DECIMAL {
	static parse(value: string) {
		return parseFloat(value)
	}
}
