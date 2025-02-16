import { SetMetadata } from '@nestjs/common'
import { PUBLIC } from '@app/auth/constants'

export const Public = () => SetMetadata(PUBLIC, true)
