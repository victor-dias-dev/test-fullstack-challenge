import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, Max } from "class-validator";

export class PlaceBetDto {
  @ApiProperty({ description: "Bet amount in cents (100 = R$1.00)", minimum: 100, maximum: 100000 })
  @IsInt()
  @Min(100)
  @Max(100000)
  amountCents!: number;
}
