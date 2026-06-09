import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Декоратор для открытых маршрутов, все остальные по дефолту закрыты
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
