import "server-only";
import { prisma } from "@/lib/prisma";
import { createPaypalOrder, capturePaypalOrder, getPaypalOrder, isPaypalConfigured } from "@/lib/paypal";
import { expireStaleBookings } from "@/server/availability";

export interface OrderResult {
  orderId?: string;
  error?: string;
}

/**
 * Crea una orden PayPal para una reserva PENDING_PAYMENT vigente. El monto
 * y la moneda salen del servicio guardado en la reserva — nunca de lo que
 * mande el cliente — para que nadie pueda manipular el precio desde el
 * navegador.
 */
export async function createOrderForBooking(bookingId: string): Promise<OrderResult> {
  if (!isPaypalConfigured()) {
    return { error: "PayPal todavía no está configurado en este entorno." };
  }

  await expireStaleBookings();

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { service: true } });
  if (!booking) return { error: "Reserva no encontrada." };
  if (booking.status !== "PENDING_PAYMENT") {
    return { error: "Esta reserva ya no está pendiente de pago." };
  }
  if (booking.paymentDeadline < new Date()) {
    return { error: "El tiempo para pagar esta reserva expiró." };
  }

  const amount = Number(booking.service.price);

  const order = await createPaypalOrder({
    amount,
    currency: booking.service.currency,
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
  });

  await prisma.$transaction([
    prisma.booking.update({ where: { id: booking.id }, data: { paypalOrderId: order.id } }),
    prisma.paypalTransaction.upsert({
      where: { paypalOrderId: order.id },
      update: { status: order.status },
      create: {
        bookingId: booking.id,
        paypalOrderId: order.id,
        status: order.status,
        amount,
        currency: booking.service.currency,
      },
    }),
  ]);

  return { orderId: order.id };
}

export interface CaptureResult {
  success?: boolean;
  bookingId?: string;
  error?: string;
}

/**
 * Captura el pago de una orden ya aprobada por el comprador. La verdad
 * viene de la respuesta de la API de PayPal (status COMPLETED + monto
 * correcto), nunca de lo que el navegador diga que pasó. Idempotente: si
 * la reserva ya está confirmada/pagada, no vuelve a capturar.
 */
export async function captureOrderForBooking(orderId: string): Promise<CaptureResult> {
  if (!isPaypalConfigured()) {
    return { error: "PayPal todavía no está configurado en este entorno." };
  }

  const transaction = await prisma.paypalTransaction.findUnique({
    where: { paypalOrderId: orderId },
    include: { booking: { include: { service: true } } },
  });
  if (!transaction) return { error: "Orden no encontrada." };

  const booking = transaction.booking;

  if (booking.status === "CONFIRMED" && booking.paymentStatus === "PAID") {
    return { success: true, bookingId: booking.id };
  }
  if (booking.status !== "PENDING_PAYMENT") {
    return { error: "Esta reserva ya no está pendiente de pago." };
  }

  // Si ya está COMPLETED en PayPal (ej. el webhook llegó antes que esta
  // llamada, o el usuario cerró la pestaña justo después de aprobar),
  // no volvemos a capturar — PayPal rechaza una segunda captura de la
  // misma orden. Solo sincronizamos nuestro registro con la realidad.
  const existingOrder = await getPaypalOrder(orderId);
  const captured = existingOrder.status === "COMPLETED" ? existingOrder : await capturePaypalOrder(orderId);
  const capture = captured.purchase_units?.[0]?.payments?.captures?.[0];

  if (captured.status !== "COMPLETED" || !capture || capture.status !== "COMPLETED") {
    await prisma.paypalTransaction.update({
      where: { paypalOrderId: orderId },
      data: { status: captured.status, rawPayload: captured as unknown as object },
    });
    return { error: "PayPal no confirmó el pago. Intenta de nuevo." };
  }

  const expectedAmount = Number(booking.service.price).toFixed(2);
  const capturedAmount = capture.amount?.value;
  if (capturedAmount !== expectedAmount || capture.amount?.currency_code !== booking.service.currency) {
    // Discrepancia de monto: no confirmamos la reserva y dejamos rastro para revisión manual.
    await prisma.paypalTransaction.update({
      where: { paypalOrderId: orderId },
      data: { status: "AMOUNT_MISMATCH", rawPayload: captured as unknown as object },
    });
    return { error: "El monto capturado no coincide con el de la reserva. Contacta soporte." };
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED", paymentStatus: "PAID", paypalCaptureId: capture.id },
    }),
    prisma.paypalTransaction.update({
      where: { paypalOrderId: orderId },
      data: {
        status: "COMPLETED",
        paypalCaptureId: capture.id,
        rawPayload: captured as unknown as object,
      },
    }),
  ]);

  return { success: true, bookingId: booking.id };
}
