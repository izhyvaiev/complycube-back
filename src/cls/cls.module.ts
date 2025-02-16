import { Global, Module } from '@nestjs/common'
import { createNamespace } from 'cls-hooked'

@Global()
@Module({
	imports: [],
	providers: [
		{
			provide: 'CLS_NAMESPACE',
			useValue: createNamespace('sequelize-transaction'),
		},
	],
	exports: ['CLS_NAMESPACE'],
})
export class ClsModule {}
