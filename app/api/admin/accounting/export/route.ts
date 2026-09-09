import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { getAccountingReport, listExpenses } from "@/server/admin/accounting";
import { fullDateLabel } from "@/lib/date-labels";
import { businessDateString } from "@/lib/timezone";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseDateParam(value: string | null, endOfDay = false): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d);
}

function rangeFor(key: string, from: string | null, to: string | null): { from?: Date; to?: Date } {
  const now = new Date();
  if (key === "mes") return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (key === "anio") return { from: new Date(now.getFullYear(), 0, 1) };
  if (key === "personalizado") return { from: parseDateParam(from), to: parseDateParam(to, true) };
  return {};
}

/** CSV de contabilidad (ventas pagadas + gastos) para que Beto se lo pase a su contador -- mismo período que ve en /admin/contabilidad. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const range = req.nextUrl.searchParams.get("range") ?? "mes";
  const { from, to } = rangeFor(range, req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"));
  const [report, expenses] = await Promise.all([getAccountingReport({ from, to }), listExpenses({ from, to })]);

  const lines: string[] = [];
  lines.push("Ventas");
  lines.push(
    ["Fecha", "Reserva", "Cliente", "Servicio", "Método", "Bruto USD", "Comisión USD", "Neto USD"]
      .map(csvCell)
      .join(","),
  );
  for (const r of report.rows) {
    lines.push(
      [
        fullDateLabel(businessDateString(r.paidAt)),
        r.bookingNumber,
        r.clientName,
        r.serviceName,
        r.paymentMethodLabel,
        r.grossUsd.toFixed(2),
        r.feeUsd.toFixed(2),
        r.netUsd.toFixed(2),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  lines.push("");
  lines.push("Gastos operativos");
  lines.push(["Fecha", "Descripción", "Categoría", "Monto USD"].map(csvCell).join(","));
  for (const e of expenses) {
    lines.push(
      [fullDateLabel(businessDateString(e.incurredAt)), e.description, e.category ?? "", Number(e.amountUsd).toFixed(2)]
        .map(csvCell)
        .join(","),
    );
  }
  lines.push("");
  lines.push(["Total bruto", report.totalGrossUsd.toFixed(2)].map(csvCell).join(","));
  lines.push(["Total comisión", report.totalFeeUsd.toFixed(2)].map(csvCell).join(","));
  lines.push(["Total neto", report.totalNetUsd.toFixed(2)].map(csvCell).join(","));
  lines.push(["Total gastos", report.totalExpensesUsd.toFixed(2)].map(csvCell).join(","));
  lines.push(["Ganancia real", report.profitUsd.toFixed(2)].map(csvCell).join(","));

  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contabilidad-${range}.csv"`,
    },
  });
}
