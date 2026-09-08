"use server";

import { revalidatePath } from "next/cache";
import { addExpense, deleteExpense, setUsdToCopRate, type ExpenseInput } from "@/server/admin/accounting";

export async function addExpenseAction(input: ExpenseInput): Promise<{ error?: string }> {
  const result = await addExpense(input);
  if (!result.error) revalidatePath("/admin/contabilidad");
  return result;
}

export async function deleteExpenseAction(id: string): Promise<{ error?: string }> {
  const result = await deleteExpense(id);
  if (!result.error) revalidatePath("/admin/contabilidad");
  return result;
}

export async function setUsdToCopRateAction(rate: number): Promise<{ error?: string }> {
  const result = await setUsdToCopRate(rate);
  if (!result.error) revalidatePath("/admin/contabilidad");
  return result;
}
