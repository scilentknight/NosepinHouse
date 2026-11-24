import AppError from "@/core/errors/AppError";
import { addressSchema } from "@/schemas/checkout";
import { validateAddressLocation } from "@/lib/checkoutCore";

export default class AddressService {
  constructor(addressRepository) {
    this.addressRepository = addressRepository;
  }

  async getUserAddresses(userId) {
    return this.addressRepository.findUserAddresses(userId);
  }

  async createAddress(userId, body) {
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid address", 400);
    }

    await validateAddressLocation(
      parsed.data.provinceId,
      parsed.data.districtId,
      parsed.data.municipalityId,
      parsed.data.wardNo
    );

    const isDefault = Boolean(body.isDefault);
    if (isDefault) {
      await this.addressRepository.clearUserDefaults(userId);
    }

    const existingCount = await this.addressRepository.countUserAddresses(userId);

    return this.addressRepository.create({
      ...parsed.data,
      landmark: parsed.data.landmark || null,
      userId: Number(userId),
      isDefault: isDefault || existingCount === 0,
    });
  }

  async updateAddress(userId, id, body) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid address id", 400);

    const existing = await this.addressRepository.findById(numId);
    if (!existing || existing.userId !== Number(userId)) {
      throw new AppError("Address not found", 404);
    }

    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid address", 400);
    }

    await validateAddressLocation(
      parsed.data.provinceId,
      parsed.data.districtId,
      parsed.data.municipalityId,
      parsed.data.wardNo
    );

    const isDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : existing.isDefault;
    if (isDefault) {
      await this.addressRepository.clearUserDefaults(userId, numId);
    }

    return this.addressRepository.update(numId, {
      ...parsed.data,
      landmark: parsed.data.landmark || null,
      isDefault,
    });
  }

  async deleteAddress(userId, id) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid address id", 400);

    const address = await this.addressRepository.findById(numId);
    if (!address || address.userId !== Number(userId)) {
      throw new AppError("Address not found", 404);
    }

    return this.addressRepository.delete(numId);
  }

  async setDefaultAddress(userId, id, isDefault) {
    const numId = Number(id);
    if (Number.isNaN(numId)) throw new AppError("Invalid address id", 400);

    const address = await this.addressRepository.findById(numId);
    if (!address || address.userId !== Number(userId)) {
      throw new AppError("Address not found", 404);
    }

    if (isDefault) {
      await this.addressRepository.clearUserDefaults(userId);
    }

    return this.addressRepository.update(numId, {
      isDefault: Boolean(isDefault),
    });
  }

  async getAddressBookTree() {
    const provinces = await this.addressRepository.findAddressBookTree();
    const data = provinces.map((province) => ({
      id: province.id,
      name: province.name,
      districts: province.children.map((district) => ({
        id: district.id,
        name: district.name,
        municipalities: district.children.map((municipality) => ({
          id: municipality.id,
          name: municipality.name,
          type: municipality.municipalityType,
          wardCount: municipality.wardCount ?? 0,
        })),
      })),
    }));

    return { provinces: data };
  }
}
