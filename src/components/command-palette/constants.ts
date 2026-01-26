import {
  Wallet,
  DollarSign,
  ShoppingBag,
  PiggyBank,
} from "lucide-react";
import { CategoryName } from "@/types/budget";

// Category icons map
export const CATEGORY_ICONS: Record<CategoryName, typeof Wallet> = {
  income: Wallet,
  needs: DollarSign,
  wants: ShoppingBag,
  savings: PiggyBank,
};
