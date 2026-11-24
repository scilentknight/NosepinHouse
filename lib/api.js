import { NextResponse } from "next/server";
import { ApiError } from "@/lib/session";
import AppError from "@/core/errors/AppError";

export function ok(data, message = "") {
    return NextResponse.json({ success: true, message, data });
}
export function fail(status, message) {
    return NextResponse.json({ success: false, message, data: null }, { status });
}
export function handleApiError(error) {
    if (error instanceof ApiError || error instanceof AppError) {
        return fail(error.statusCode || error.status, error.message);
    }
    if (error?.statusCode || error?.status) {
        return fail(error.statusCode || error.status, error.message);
    }
    console.error(error);
    return fail(500, "Something went wrong");
}

