import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: any, _: ArgumentMetadata) {
    if (value instanceof Object) {
      return this.serializeDate(value);
    }
    return value;
  }

  private serializeDate(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (obj[key] instanceof Date) {
        result[key] = obj[key].toISOString();
      } else if (this.isObject(obj[key])) {
        result[key] = this.serializeDate(obj[key]);
      }
    }
    return obj;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
