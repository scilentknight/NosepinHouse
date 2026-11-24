import bcrypt from "bcryptjs";
import AppError from "@/core/errors/AppError";
import { parsePagination } from "@/lib/admin-query";
import { updateProfileSchema } from "@/schemas/auth";
import { adminProfileSchema, changePasswordSchema } from "@/schemas/admin-settings";
import { customerPutSchema, customerPatchSchema } from "@/schemas/admin-customer";

function mapCustomer(customer) {
  if (!customer) return null;
  return {
    ...customer,
    orders: (customer.orders || []).map((order) => ({
      ...order,
      total: Number(order.total),
    })),
  };
}

export default class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId, {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async updateProfile(userId, body) {
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    return this.userRepository.update(
      userId,
      {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        image: parsed.data.image,
      },
      { id: true, name: true, email: true, phone: true, image: true }
    );
  }

  async getAdminProfile(adminId) {
    const user = await this.userRepository.findById(adminId, {
      id: true,
      name: true,
      email: true,
      image: true,
    });
    if (!user) throw new AppError("User not found", 404);
    return user;
  }

  async updateAdminProfile(adminId, body) {
    const parsed = adminProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await this.userRepository.findByEmail(email);
    if (existing && existing.id !== Number(adminId)) {
      throw new AppError("This email is already in use", 400);
    }

    return this.userRepository.update(
      adminId,
      {
        name: parsed.data.name,
        email,
        image: parsed.data.image,
      },
      { id: true, name: true, email: true, image: true }
    );
  }

  async changeAdminPassword(adminId, body) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const user = await this.userRepository.findById(adminId);
    if (!user) throw new AppError("User not found", 404);

    const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await this.userRepository.update(adminId, { passwordHash });
  }

  async getCustomers(searchParams) {
    const search = searchParams.get("search")?.trim();
    const verified = searchParams.get("verified");
    const { page, pageSize, skip } = parsePagination(searchParams);

    const where = {
      role: "USER",
      ...(verified === "true" ? { emailVerified: { not: null } } : {}),
      ...(verified === "false" ? { emailVerified: null } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      this.userRepository.findCustomers({ where, skip, take: pageSize }),
      this.userRepository.countCustomers(where),
    ]);

    return { customers, total, page, pageSize };
  }

  async getCustomerById(id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid customer id", 400);

    const customer = await this.userRepository.findCustomerById(numId);
    if (!customer) throw new AppError("Customer not found", 404);

    return mapCustomer(customer);
  }

  async updateCustomer(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid customer id", 400);

    const existing = await this.userRepository.findCustomerById(numId);
    if (!existing) throw new AppError("Customer not found", 404);

    const parsed = customerPutSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailCheck = await this.userRepository.findByEmail(email);
    if (emailCheck && emailCheck.id !== numId) {
      throw new AppError("This email is already in use", 400);
    }

    const phone =
      parsed.data.phone === undefined || parsed.data.phone === "" ? null : parsed.data.phone;

    const customer = await this.userRepository.update(
      numId,
      {
        name: parsed.data.name,
        email,
        phone,
      }
    );

    const updated = await this.userRepository.findCustomerById(numId);
    return mapCustomer(updated);
  }

  async patchCustomer(id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid customer id", 400);

    const existing = await this.userRepository.findCustomerById(numId);
    if (!existing) throw new AppError("Customer not found", 404);

    const parsed = customerPatchSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid request", 400);
    }

    const data = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) {
      data.phone = parsed.data.phone === "" ? null : parsed.data.phone;
    }
    if (parsed.data.email !== undefined) {
      const email = parsed.data.email.toLowerCase().trim();
      const emailCheck = await this.userRepository.findByEmail(email);
      if (emailCheck && emailCheck.id !== numId) {
        throw new AppError("This email is already in use", 400);
      }
      data.email = email;
    }
    if (parsed.data.emailVerified !== undefined) {
      data.emailVerified = parsed.data.emailVerified
        ? existing.emailVerified ?? new Date()
        : null;
    }

    await this.userRepository.update(numId, data);
    const updated = await this.userRepository.findCustomerById(numId);
    return mapCustomer(updated);
  }
}
