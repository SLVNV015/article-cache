import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/modules/users/user.entity';

@Index(['authorId', 'createdAt'])
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

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Index()
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
