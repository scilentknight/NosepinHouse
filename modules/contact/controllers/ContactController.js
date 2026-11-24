import { NextResponse } from "next/server";
import AppError from "@/core/errors/AppError";

export default class ContactController {
  constructor(contactService) {
    this.contactService = contactService;
  }

  async getMessages(request) {
    try {
      const { searchParams } = new URL(request.url);
      const result = await this.contactService.getMessages(searchParams);
      return NextResponse.json({
        success: true,
        data: result.messages,
        pagination: result.pagination,
      });
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500;
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Unable to retrieve contact messages.",
          error: error.message || "Unable to retrieve contact messages.",
        },
        { status }
      );
    }
  }

  async createMessage(request) {
    try {
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid request format.",
            error: "Invalid request format.",
          },
          { status: 415 }
        );
      }

      const body = await request.json();
      const message = await this.contactService.createMessage(body);
      return NextResponse.json(
        {
          success: true,
          message: "Thank you! Your message has been sent successfully.",
          data: message,
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof SyntaxError) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid JSON request.",
            error: "Invalid JSON request.",
          },
          { status: 400 }
        );
      }
      const status = error instanceof AppError ? error.statusCode : 500;
      return NextResponse.json(
        {
          success: false,
          message:
            error.message || "Unable to send your message right now. Please try again later.",
          error:
            error.message || "Unable to send your message right now. Please try again later.",
        },
        { status }
      );
    }
  }

  async getMessageById(request, { params }) {
    try {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const inquiry = await this.contactService.getMessageById(id);
      return NextResponse.json({
        success: true,
        data: inquiry,
      });
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500;
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Failed to retrieve inquiry.",
          error: error.message || "Failed to retrieve inquiry.",
        },
        { status }
      );
    }
  }

  async updateStatus(request, { params }) {
    try {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      const body = await request.json();
      const updated = await this.contactService.updateStatus(id, body?.status);
      return NextResponse.json({
        success: true,
        message: "Inquiry status updated successfully.",
        data: updated,
      });
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500;
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Failed to update inquiry status.",
          error: error.message || "Failed to update inquiry status.",
        },
        { status }
      );
    }
  }

  async deleteMessage(request, { params }) {
    try {
      const resolvedParams = await params;
      const id = resolvedParams.id;
      await this.contactService.deleteMessage(id);
      return NextResponse.json({
        success: true,
        message: "Inquiry deleted successfully.",
      });
    } catch (error) {
      const status = error instanceof AppError ? error.statusCode : 500;
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Failed to delete inquiry.",
          error: error.message || "Failed to delete inquiry.",
        },
        { status }
      );
    }
  }
}
