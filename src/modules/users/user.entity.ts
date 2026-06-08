import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import z from 'zod';
import { UserBaseSchema } from './user.schema';

type IUser = z.infer<typeof UserBaseSchema>;

/**
 * сущность пользователя
 */
@Entity()
export class User implements IUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, type: 'varchar', length: 255 })
  email!: string;

  /**
   * @description хешированный пароль
   */
  @Column({ type: 'varchar', select: false })
  password!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
