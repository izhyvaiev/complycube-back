require('dotenv').config()

const config = ['development', 'test', 'production'].reduce((acc, env) => {
	return {
		...acc,
		[env]: {
			username: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: env === 'test' ? process.env.TEST_DB_NAME : process.env.DB_NAME,
			host: process.env.DB_HOST,
			dialect: 'postgres',
			seederStorage: 'sequelize',
			port: parseInt(process.env.DB_PORT, 10) || 5432,
		},
	}
}, {})

module.exports = config
