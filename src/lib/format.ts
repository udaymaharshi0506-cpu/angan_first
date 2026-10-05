export function formatPrice(price: number, category?: string) {
  if (category === "buy_home") {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
    return `₹${(price / 100000).toFixed(0)} L`;
  }
  if (price >= 100000) return `₹${(price / 100000).toFixed(2).replace(/\.00$/, "")} L/mo`;
  return `₹${price.toLocaleString("en-IN")}/mo`;
}

export const categoryLabel: Record<string, string> = {
  buy_home: "Homes for sale",
  rent_home: "Homes for rent",
  rent_pg: "PG & co-living",
  rent_commercial: "Commercial spaces",
};
