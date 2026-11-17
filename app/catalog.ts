import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Ticket { id: string; label: string; price: number }
export interface Hotel { name: string; pricePerNight: number }
export interface Catalog {
  resortName: string;
  tickets: Ticket[];
  parkHours: { open: string; close: string };
  hotels: Hotel[];
  policies: { kidsFreeUnderAge: number; discounts: string };
}

export const catalog: Catalog = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'catalog.json'), 'utf8'),
);
