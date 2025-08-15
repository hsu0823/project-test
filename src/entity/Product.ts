//資料模型
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Length, Min, IsInt, IsNotEmpty } from 'class-validator';

@Entity({ name: 'product' })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string; // id (UUID) – 由後端產生

  @IsNotEmpty()
  @Length(2, 100)
  @Index({ unique: true })
  @Column({ length: 100, nullable: false })
  name!: string; // name (string, 2–100) – 必填、唯一

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: false })
  price!: string; // price (decimal(12,2)) – 必填、>= 0

  @IsInt()
  @Min(0)
  @Column({ type: 'integer', nullable: false, default: 0 })
  stock!: number; // stock (int) – 必填、>= 0

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date; //createdAt / updatedAt (timestamp)
}