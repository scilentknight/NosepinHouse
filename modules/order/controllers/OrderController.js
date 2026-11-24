import { ok, fail, handleApiError } from "@/lib/api";
import { requireAdmin, requireUser } from "@/lib/session";
import { updateStatusSchema } from "@/schemas/admin-order";
import { returnActionSchema } from "@/schemas/admin-order";
import { returnRequestSchema } from "@/schemas/order";

export default class OrderController {
  constructor(orderService) {
    this.orderService = orderService;
  }

  // ── Admin ────────────────────────────────────────────────
  async adminGetAll(request) {
    try {
      await requireAdmin();
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const paymentStatus = searchParams.get("paymentStatus");
      const paymentMethod = searchParams.get("paymentMethod");
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      const search = searchParams.get("search")?.trim();
      const page = Math.max(1, Number(searchParams.get("page")) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
      const data = await this.orderService.getAdminOrders({
        status, paymentStatus, paymentMethod, from, to, search, page, pageSize,
      });
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async adminGetOne(_request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const data = await this.orderService.getAdminOrderById(id);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async adminUpdateStatus(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const body = await request.json();
      const parsed = updateStatusSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      await this.orderService.updateOrderStatus(id, parsed.data);
      return ok(null, "Order updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async adminGetInvoice(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const isPreview = new URL(request.url).searchParams.get("mode") === "preview";
      const { buffer, orderNumber } = await this.orderService.getAdminInvoicePdf(id, isPreview);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="invoice-${orderNumber}.pdf"`,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  async adminProcessReturn(request, id) {
    try {
      await requireAdmin();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const body = await request.json();
      const parsed = returnActionSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid request");
      await this.orderService.processAdminReturn(id, parsed.data);
      return ok(null, "Return updated");
    } catch (error) {
      return handleApiError(error);
    }
  }

  // ── Customer ─────────────────────────────────────────────
  async userGetAll(request) {
    try {
      const user = await requireUser();
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const data = await this.orderService.getUserOrders(user.id, status);
      return ok(data);
    } catch (error) {
      return handleApiError(error);
    }
  }

  async userCancelOrder(request, id) {
    try {
      const user = await requireUser();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const body = await request.json().catch(() => ({}));
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      await this.orderService.cancelUserOrder(user.id, id, reason);
      return ok(null, "Order cancelled");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async userRequestReturn(request, id) {
    try {
      const user = await requireUser();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const body = await request.json();
      const parsed = returnRequestSchema.safeParse(body);
      if (!parsed.success)
        return fail(400, parsed.error.issues[0]?.message ?? "Invalid return request");
      await this.orderService.requestUserReturn(user.id, id, parsed.data.reason);
      return ok(null, "Return requested");
    } catch (error) {
      return handleApiError(error);
    }
  }

  async userGetInvoice(request, id) {
    try {
      const user = await requireUser();
      if (Number.isNaN(id)) return fail(400, "Invalid order id");
      const isPreview = new URL(request.url).searchParams.get("mode") === "preview";
      const { buffer, orderNumber } = await this.orderService.getUserInvoicePdf(user.id, id, isPreview);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${isPreview ? "inline" : "attachment"}; filename="invoice-${orderNumber}.pdf"`,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
}
