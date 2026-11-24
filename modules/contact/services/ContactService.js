import AppError from "@/core/errors/AppError";

const allowedSubjects = new Set([
  "order",
  "product",
  "shipping",
  "return",
  "other",
]);

const allowedStatuses = new Set([
  "NEW",
  "READ",
  "IN_PROGRESS",
  "REPLIED",
  "RESOLVED",
  "CLOSED",
]);

export default class ContactService {
  constructor(contactRepository) {
    this.contactRepository = contactRepository;
  }

  async getMessages(searchParams) {
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") || "20", 10) || 20)
    );

    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const where = {};
    if (status) {
      if (!allowedStatuses.has(status)) {
        throw new AppError("Invalid status filter.", 400);
      }
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { subject: { contains: search } },
        { message: { contains: search } },
      ];
    }

    const [messages, total] = await Promise.all([
      this.contactRepository.findMessages({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.contactRepository.countMessages(where),
    ]);

    return {
      messages,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async createMessage(body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !subject || !message) {
      throw new AppError("Please fill in all required fields.", 400);
    }
    if (name.length > 100) {
      throw new AppError("Name must be 100 characters or fewer.", 400);
    }
    if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError("Please enter a valid email address.", 400);
    }
    if (phone.length > 30) {
      throw new AppError("Phone number is too long.", 400);
    }
    if (!allowedSubjects.has(subject)) {
      throw new AppError("Please select a valid subject.", 400);
    }
    if (message.length < 10 || message.length > 5000) {
      throw new AppError("Your message must be between 10 and 5000 characters.", 400);
    }

    return this.contactRepository.create({
      name,
      email,
      phone: phone || null,
      subject,
      message,
      status: "NEW",
    });
  }

  async getMessageById(id) {
    const numId = Number.parseInt(id, 10);
    if (Number.isNaN(numId) || numId <= 0) {
      throw new AppError("Invalid inquiry ID.", 400);
    }

    const inquiry = await this.contactRepository.findById(numId);
    if (!inquiry) {
      throw new AppError("Inquiry not found.", 404);
    }

    return inquiry;
  }

  async updateStatus(id, rawStatus) {
    const numId = Number.parseInt(id, 10);
    if (Number.isNaN(numId) || numId <= 0) {
      throw new AppError("Invalid inquiry ID.", 400);
    }

    const status = typeof rawStatus === "string" ? rawStatus.trim() : "";
    if (!status || !allowedStatuses.has(status)) {
      throw new AppError("Invalid status provided.", 400);
    }

    const existing = await this.contactRepository.findById(numId);
    if (!existing) {
      throw new AppError("Inquiry not found.", 404);
    }

    return this.contactRepository.update(numId, { status });
  }

  async deleteMessage(id) {
    const numId = Number.parseInt(id, 10);
    if (Number.isNaN(numId) || numId <= 0) {
      throw new AppError("Invalid inquiry ID.", 400);
    }

    const existing = await this.contactRepository.findById(numId);
    if (!existing) {
      throw new AppError("Inquiry not found.", 404);
    }

    return this.contactRepository.delete(numId);
  }
}
