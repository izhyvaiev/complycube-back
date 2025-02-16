import { plainToInstance } from 'class-transformer';
import { ClassConstructor } from 'class-transformer/types/interfaces';

export const fillDto = <T, V extends Record<string, any>>(cls: ClassConstructor<T>, plain: V) =>
  plainToInstance<T, V>(cls, plain,  { excludeExtraneousValues: true })