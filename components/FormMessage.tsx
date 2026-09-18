export function FormMessage({ message, type = "error" }: { message?: string; type?: "error" | "success" }) {
  if (!message) return null;

  return (
    <p
      role={type === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
        type === "success"
          ? "border-green-200 bg-green-50 text-green-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {message}
    </p>
  );
}
