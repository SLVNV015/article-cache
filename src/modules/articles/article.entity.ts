import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/modules/users/user.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 512 })
  title!: string;

  @Column({ type: 'varchar', length: 1024 })
  description!: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @JoinColumn({ name: 'author_id' })
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  author: User;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
