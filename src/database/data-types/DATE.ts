import Sequelize from 'sequelize'

// @ts-ignore
export class DATE extends Sequelize.DataTypes.DATEONLY {
	static parse(value: string) {
		return value
	}
}
