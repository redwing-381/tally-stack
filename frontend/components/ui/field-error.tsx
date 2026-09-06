/**
 * One-line validation message under a field. Renders nothing when there's
 * no error, so callers can drop it in unconditionally.
 *
 * Errors are shown rather than only disabling the save button: a disabled
 * button with no explanation leaves people guessing which field is wrong.
 */
export function FieldError({ children }: { children?: string | boolean | null }) {
  // Accepts the `condition && "message"` shape call sites naturally produce,
  // which widens to string | boolean — render only a real message.
  if (typeof children !== "string" || !children) return null;
  return <p className="text-xs text-destructive">{children}</p>;
}
