//建立商品
import { IsNotEmpty, IsNumber, Min, IsInt } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(0)
  stock!: number;
}