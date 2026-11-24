const statusStyles = {
    PROCESSING: "bg-amber-100 text-amber-800",
    SHIPPED: "bg-blue-100 text-blue-800",
    DELIVERED: "bg-green-100 text-green-800",
    RETURNED: "bg-orange-100 text-orange-800",
    CANCELLED: "bg-red-100 text-red-800",
    PENDING: "bg-amber-100 text-amber-800",
    PAID: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-600",
    DRAFT: "bg-gray-100 text-gray-600",
    PUBLISHED: "bg-green-100 text-green-800",
    ARCHIVED: "bg-orange-100 text-orange-800",
    IN_STOCK: "bg-green-100 text-green-800",
    OUT_OF_STOCK: "bg-red-100 text-red-800",
    ON_BACKORDER: "bg-amber-100 text-amber-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    NEW: "bg-blue-100 text-blue-800",
    READ: "bg-purple-100 text-purple-800",
    IN_PROGRESS: "bg-amber-100 text-amber-800",
    REPLIED: "bg-teal-100 text-teal-800",
    RESOLVED: "bg-green-100 text-green-800",
    CLOSED: "bg-gray-100 text-gray-600",
};
export function StatusBadge({ status }) {
    if (!status) return null;
    const style = statusStyles[status] ?? "bg-gray-100 text-gray-700";
    const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (<span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>);
}
