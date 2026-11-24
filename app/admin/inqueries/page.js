"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  Trash2,
  X,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/admin/SearchInput";
import { Pagination } from "@/components/admin/Pagination";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

const PAGE_SIZE = 20;

const SUBJECT_LABELS = {
  order: "Order Inquiry",
  product: "Product Inquiry",
  shipping: "Shipping & Delivery",
  return: "Returns & Exchange",
  other: "Something Else",
};

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSubjectLabel(subject) {
  if (!subject) return "Other";
  return (
    SUBJECT_LABELS[subject] ||
    subject.charAt(0).toUpperCase() + subject.slice(1)
  );
}

export default function AdminInquiriesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const response = await fetch(`/api/contact?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error || json.message || "Failed to load inquiries.",
        );
      }

      setRows(json.data ?? []);
      setTotal(json.pagination?.total ?? 0);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setRows([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function updateStatus(id, nextStatus) {
    setIsBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/contact/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error || json.message || "Failed to update inquiry.",
        );
      }

      if (selectedInquiry?.id === id) {
        setSelectedInquiry((current) =>
          current ? { ...current, status: nextStatus } : null,
        );
      }

      await load();
    } catch (err) {
      setError(err.message || "Failed to update inquiry.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    if (deleteTarget === null) return;

    setIsBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/contact/${deleteTarget}`, {
        method: "DELETE",
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json.error || json.message || "Failed to delete inquiry.",
        );
      }

      if (selectedInquiry?.id === deleteTarget) {
        setSelectedInquiry(null);
      }

      setDeleteTarget(null);

      // If deleting the final row on a page, move to the previous page.
      if (rows.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (err) {
      setError(err.message || "Failed to delete inquiry.");
    } finally {
      setIsBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Inquiries
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage customer messages submitted through the contact
            page.
          </p>
        </div>

        <div className="text-sm text-gray-500">
          Total: <span className="font-semibold text-gray-900">{total}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name, email, or message..."
          className="w-full sm:w-80"
        />

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-soft">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Loading inquiries...
          </p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No inquiries found.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rows.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {inquiry.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {inquiry.email}
                        </div>
                        {inquiry.phone && (
                          <div className="text-xs text-gray-400">
                            {inquiry.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {getSubjectLabel(inquiry.subject)}
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-2 text-gray-600">
                          {inquiry.message}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {formatDate(inquiry.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <StatusBadge status={inquiry.status} />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedInquiry(inquiry)}
                            title="View inquiry"
                            aria-label="View inquiry"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(inquiry.id)}
                            title="Delete inquiry"
                            aria-label="Delete inquiry"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile uses a compact list, not cards. */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {rows.map((inquiry) => (
                <li key={inquiry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {inquiry.name}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {inquiry.email}
                      </p>
                    </div>
                    <StatusBadge status={inquiry.status} />
                  </div>

                  <p className="mt-2 text-sm font-medium text-gray-700">
                    {getSubjectLabel(inquiry.subject)}
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {inquiry.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">
                      {formatDate(inquiry.createdAt)}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedInquiry(inquiry)}
                        title="View inquiry"
                        aria-label="View inquiry"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(inquiry.id)}
                        title="Delete inquiry"
                        aria-label="Delete inquiry"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="px-2">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* Inquiry details modal */}
      {selectedInquiry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedInquiry(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2
                  id="inquiry-modal-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Inquiry details
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Received {formatDate(selectedInquiry.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                aria-label="Close details"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {selectedInquiry.name}
                </h3>
                <StatusBadge status={selectedInquiry.status} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Email</p>
                    <a
                      href={`mailto:${selectedInquiry.email}`}
                      className="break-all text-sm text-gray-900 hover:underline"
                    >
                      {selectedInquiry.email}
                    </a>
                  </div>
                </div>

                {selectedInquiry.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <a
                        href={`tel:${selectedInquiry.phone}`}
                        className="text-sm text-gray-900 hover:underline"
                      >
                        {selectedInquiry.phone}
                      </a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Subject</p>
                    <p className="text-sm text-gray-900">
                      {getSubjectLabel(selectedInquiry.subject)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Received</p>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedInquiry.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-900">
                  Message
                </h4>
                <div className="whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-700">
                  {selectedInquiry.message}
                </div>
              </div>

              <div>
                <label
                  htmlFor="inquiry-status"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Update status
                </label>

                <select
                  id="inquiry-status"
                  value={selectedInquiry.status}
                  disabled={isBusy}
                  onChange={(event) =>
                    updateStatus(selectedInquiry.id, event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:opacity-50 sm:w-64"
                >
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this inquiry?"
        description="This will permanently remove this customer inquiry. This cannot be undone."
        confirmLabel="Delete"
        danger
        isBusy={isBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
