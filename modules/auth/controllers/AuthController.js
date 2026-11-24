import { NextResponse } from "next/server";
import { handleApiError, ok } from "@/lib/api";

export default class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async register(request) {
    try {
      const body = await request.json();
      const result = await this.authService.register(body);
      return NextResponse.json({
        success: true,
        pendingVerification: result.pendingVerification,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  async verifyOtp(request) {
    try {
      const body = await request.json();
      const result = await this.authService.verifyOtp(body);
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  async resendOtp(request) {
    try {
      const body = await request.json();
      const result = await this.authService.resendOtp(body);
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  async forgotPassword(request) {
    try {
      const body = await request.json();
      const origin = new URL(request.url).origin;
      const result = await this.authService.forgotPassword(body, origin);
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }

  async resetPassword(request) {
    try {
      const body = await request.json();
      const result = await this.authService.resetPassword(body);
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
}
