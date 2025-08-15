//更新商品
import { IsNumber, Min, IsInt, IsOptional, Length } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}