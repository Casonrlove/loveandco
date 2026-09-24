export const CUSTOM_QUANTITY_MIN = 1;
export const CUSTOM_QUANTITY_MAX = 500;

export function parseCustomQuantity(value) {
  const quantity = Number(value);
  return Number.isInteger(quantity) && quantity >= CUSTOM_QUANTITY_MIN && quantity <= CUSTOM_QUANTITY_MAX
    ? quantity
    : null;
}
