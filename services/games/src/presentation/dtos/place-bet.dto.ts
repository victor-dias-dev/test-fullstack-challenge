import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min, Max } from "class-validator";

export class PlaceBetDto {
  @ApiProperty({ description: "Bet amount in cents (100 = R$1.00)", minimum: 100, maximum: 1_000_000 })
  @IsInt()
  @Min(100)
  @Max(1_000_000)
  amountCents!: number;
}
