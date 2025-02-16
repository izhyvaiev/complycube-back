import { Inject } from '@nestjs/common'
import { Sequelize } from 'sequelize-typescript'
import type { Namespace } from 'cls-hooked'

export const SEQUELIZE = Symbol('@Transaction.database')
export const NAMESPACE = Symbol('@Transaction.namespace')

export const Transaction = () => {
	const injectSequelize = Inject(Sequelize) // https://stackoverflow.com/a/60608856
	const injectNamespace = Inject('CLS_NAMESPACE')

	return (target: any, propertyKey: string, propertyDescriptor: PropertyDescriptor) => {
		injectSequelize(target, SEQUELIZE)
		injectNamespace(target, NAMESPACE)

		const originalMethod = propertyDescriptor.value

		propertyDescriptor.value = async function (...args: any[]) {
			const transaction = this[NAMESPACE].get('transaction')
			let transactionDepth = this[NAMESPACE].get('transactionDepth')
			if (transaction) {
				transactionDepth++
				this[NAMESPACE].set('transactionDepth', transactionDepth)
				await (this[SEQUELIZE] as Sequelize).query(`SAVEPOINT complycube_${transactionDepth}`)
				try {
					const result = await originalMethod.apply(this, args)
					await (this[SEQUELIZE] as Sequelize).query(`RELEASE SAVEPOINT complycube_${transactionDepth}`)
					return result
				} catch (e) {
					await (this[SEQUELIZE] as Sequelize).query(`ROLLBACK TO SAVEPOINT complycube_${transactionDepth}`)
					throw e
				} finally {
					this[NAMESPACE].set('transactionDepth', transactionDepth - 1)
				}
			}
			return (this[SEQUELIZE] as Sequelize).transaction(async () => {
				;(this[NAMESPACE] as Namespace).set('transactionDepth', 0)
				return originalMethod.apply(this, args)
			})
		}
	}
}
