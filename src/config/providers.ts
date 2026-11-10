// One product from GET /config (`data.product`). `mark` and `accent` are the
// monogram shown when `image` is missing.
export type Provider = {
  id: string;
  name: string;
  mark: string;
  accent: string;
  image?: string;
  group?: string; // product category title, e.g. "Slots"
};
