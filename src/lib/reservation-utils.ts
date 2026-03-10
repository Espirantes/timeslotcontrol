/**
 * Maps internal status enum values to contextual i18n keys based on reservation type.
 * For LOADING reservations, UNLOADING_STARTED/COMPLETED become LOADING_STARTED/COMPLETED.
 */
export function statusKey(status: string, reservationType?: string): string {
  if (reservationType === "LOADING") {
    if (status === "UNLOADING_STARTED") return "LOADING_STARTED";
    if (status === "UNLOADING_COMPLETED") return "LOADING_COMPLETED";
  }
  return status;
}
