/** One Apple Maps result: a place (usually a business) or a plain address. */
export interface PlaceResult {
  name: string;
  /** Street, area, city and postcode, as available. */
  address: string;
  latitude: number;
  longitude: number;
  /** Apple Maps files it under fitness centres. */
  isGym: boolean;
}
