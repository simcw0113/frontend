// One product from GET /config (`data.product`). `mark` and `accent` are the
// monogram shown when `image` is missing.
export type Provider = {
  id: string; // public_code — the lobby locates a product by this
  code: string; // internal product code sent to POST /game_list
  name: string;
  mark: string;
  accent: string;
  image?: string;
  group?: string; // product category title, e.g. "Slots"
};
