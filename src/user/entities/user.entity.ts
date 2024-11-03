import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class UserOrm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  userName: string;

  @Column({ default: '' })
  imageUrl: string;

  @Column('int', { array: true, default: [] })
  following: number[];

  @Column('int', { array: true, default: [] })
  followers: number[];

  @Column({ default: '' })
  description: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created: Date;
}
