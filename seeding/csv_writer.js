/**
 * write-csvs.js
 *
 * Writes arrays of the following types into CSV files under ./output/
 *
 * Types (JSDoc):
 *  @typedef {{id: string, name: string}} Category 
 *  @typedef {{id: string, categoryId: string, ean: string, name: string, retailPrice: number}} Product 
 *  @typedef {{id: string, name: string, url: string}} Store 
 *  @typedef {{storeId: string, productId: string, price: number, amount: number}} Offer 
 *
 * Exports:
 *  - writeAllToCSVs({ categories, products, stores, offers }, outputDir = './output')
 *
 * If executed directly (node write-csvs.js) it will run a small example and write files.
 */

import { promises as fs } from 'fs';
import { resolve, join } from 'path';

/**
 * Escape a single CSV cell value according to RFC4180-ish rules:
 * - wrap in double quotes if it contains comma, quote, newline or CR
 * - double any internal double quotes
 * @param {any} value
 * @returns {string}
 */
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'number' ? String(value) : String(value);
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Convert an array of objects to CSV text given an ordered list of headers.
 * @param {string[]} headers
 * @param {Object[]} rows
 * @returns {string}
 */
function arrayToCSV(headers, rows) {
  const headerLine = headers.join(',');
  const lines = rows.map((row) =>
    headers
      .map((h) => {
        // allow nested properties if header uses dot notation, but not required here
        if (h.includes('.')) {
          const parts = h.split('.');
          let v = row;
          for (const p of parts) {
            v = v == null ? v : v[p];
          }
          return escapeCSV(v);
        }
        return escapeCSV(row[h]);
      })
      .join(',')
  );
  return [headerLine, ...lines].join('\n') + '\n';
}

/**
 * Remove file if it exists. Ignores if it does not exist.
 * @param {string} filePath
 */
async function removeFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    // else ignore
  }
}

/**
 * Write arrays of Category, Product, Store, Offer to CSV files in outputDir.
 * It will create the directory if it does not exist and delete existing CSV files before writing.
 *
 * @param {Object} data
 * @param {Category[]} [data.categories=[]]
 * @param {Product[]} [data.products=[]]
 * @param {Store[]} [data.stores=[]]
 * @param {Offer[]} [data.offers=[]]
 * @param {string} [outputDir='./output']
 */
export async function writeAllToCSVs(
  {
    categories = [],
    products = [],
    stores = [],
    offers = []
  } = {},
  outputDir = './output'
) {
  const outPath = resolve(outputDir);

  // Ensure output directory exists
  await fs.mkdir(outPath, { recursive: true });

  // Files and their headers (ordered)
  const files = [
    {
      filename: 'categories.csv',
      headers: ['id', 'name'],
      rows: categories
    },
    {
      filename: 'products.csv',
      headers: ['id', 'categoryId', 'ean', 'name', 'retailPrice'],
      rows: products
    },
    {
      filename: 'stores.csv',
      headers: ['id', 'name', 'url'],
      rows: stores
    },
    {
      filename: 'offers.csv',
      headers: ['storeId', 'productId', 'price', 'amount'],
      rows: offers
    }
  ];

  // Remove existing files (if any)
  await Promise.all(
    files.map(({ filename }) => removeFileIfExists(join(outPath, filename)))
  );

  // Write all CSVs
  await Promise.all(
    files.map(async ({ filename, headers, rows }) => {
      const csvText = arrayToCSV(headers, rows);
      const target = join(outPath, filename);
      await fs.writeFile(target, csvText, 'utf8');
    })
  );
}

/** @typedef {{id: string, name: string}} Category */
/** @typedef {{id: string, categoryId: string, ean: string, name: string, retailPrice: number}} Product */
/** @typedef {{id: string, name: string, url: string}} Store */
/** @typedef {{storeId: string, productId: string, price: number, amount: number}} Offer */

/**
 * Parse CSV text into an array of rows (each row is an array of cell strings).
 * Correctly handles quoted fields, escaped quotes ("") and CR/LF or LF line endings,
 * and embedded newlines in quoted fields.
 * @param {string} text
 * @returns {string[][]}
 */
function parseCSV(text) {
  if (text == null || text === '') return [];

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows = [];
  let cur = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // check for escaped quote
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i++; // skip next quote
        } else {
          inQuotes = false; // closing quote
        }
      } else {
        cur += ch;
      }
      continue;
    }

    // not in quotes
    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ',') {
      row.push(cur);
      cur = '';
      continue;
    }

    if (ch === '\r') {
      // handle CRLF or lone CR
      if (i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      continue;
    }

    if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
      continue;
    }

    cur += ch;
  }

  // push remaining
  // This handles a final newline absence
  if (inQuotes) {
    // malformed CSV (unclosed quote) — we still push what we have
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }

  return rows;
}

/**
 * Convert parsed CSV rows to array of objects using header row.
 * Extra columns are ignored; missing columns become empty strings.
 * @param {string[][]} rows
 * @returns {Object[]}
 */
function rowsToObjects(rows) {
  if (!rows || rows.length === 0) return [];
  const header = rows[0].map(h => (h == null ? '' : String(h).trim()));
  const dataRows = rows.slice(1);
  return dataRows.map(cells => {
    const obj = {};
    for (let i = 0; i < header.length; i++) {
      const key = header[i] || `column${i}`;
      const val = (i < cells.length && cells[i] != null) ? cells[i] : '';
      obj[key] = val;
    }
    return obj;
  });
}

/**
 * Try to read a CSV file and return objects. If file doesn't exist, returns [].
 * @param {string} dir
 * @param {string} filename
 * @returns {Promise<Object[]>}
 */
async function readCSVFileObjects(dir, filename) {
  const filePath = path.join(dir, filename);
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const parsed = parseCSV(text);
    return rowsToObjects(parsed);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      // file doesn't exist -> return empty array
      return [];
    }
    throw err;
  }
}

/**
 * Helper to coerce a value to a number if possible, otherwise returns NaN.
 * Empty strings will return NaN.
 * @param {string} v
 * @returns {number}
 */
function toNumber(v) {
  if (v === '' || v == null) return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Read categories.csv, products.csv, stores.csv, offers.csv from outputDir and convert to typed arrays.
 * If a file is missing it will be treated as empty.
 *
 * @param {string} [outputDir='./output']
 * @returns {Promise<{categories: Category[], products: Product[], stores: Store[], offers: Offer[]}>}
 */
export async function readAllFromCSVs(outputDir = './output') {
  const outPath = path.resolve(outputDir);

  // Ensure output directory exists; if not, return empty arrays (no files)
  try {
    await fs.access(outPath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return { categories: [], products: [], stores: [], offers: [] };
    }
    throw err;
  }

  const [
    categoriesRaw,
    productsRaw,
    storesRaw,
    offersRaw
  ] = await Promise.all([
    readCSVFileObjects(outPath, 'categories.csv'),
    readCSVFileObjects(outPath, 'products.csv'),
    readCSVFileObjects(outPath, 'stores.csv'),
    readCSVFileObjects(outPath, 'offers.csv')
  ]);

  // Map raw objects (string values) to typed objects
  const categories = categoriesRaw.map(r => ({
    id: r.id ?? '',
    name: r.name ?? ''
  }));

  const products = productsRaw.map(r => ({
    id: r.id ?? '',
    categoryId: r.categoryId ?? '',
    ean: r.ean ?? '',
    name: r.name ?? '',
    retailPrice: (() => {
      const n = toNumber(r.retailPrice ?? r.retailprice ?? '');
      return Number.isFinite(n) ? n : NaN;
    })()
  }));

  const stores = storesRaw.map(r => ({
    id: r.id ?? '',
    name: r.name ?? '',
    url: r.url ?? ''
  }));

  const offers = offersRaw.map(r => ({
    storeId: r.storeId ?? r.storeid ?? '',
    productId: r.productId ?? r.productid ?? '',
    price: (() => {
      const n = toNumber(r.price ?? '');
      return Number.isFinite(n) ? n : NaN;
    })(),
    amount: (() => {
      const n = toNumber(r.amount ?? '');
      return Number.isFinite(n) ? n : NaN;
    })()
  }));

  return { categories, products, stores, offers };
}







//   (async () => {
//     const example = {
//       categories: [
//         { id: 'c1', name: 'Beverages' },
//         { id: 'c2', name: 'Snacks' }
//       ],
//       products: [
//         { id: 'p1', categoryId: 'c1', ean: '1234567890123', name: 'Cola, 500ml', retailPrice: 1.99 },
//         { id: 'p2', categoryId: 'c2', ean: '9876543210987', name: 'Chips "Crunch"', retailPrice: 2.49 }
//       ],
//       stores: [
//         { id: 's1', name: 'Corner Shop', url: 'https://corner.example.com' }
//       ],
//       offers: [
//         { storeId: 's1', productId: 'p1', price: 1.79, amount: 10 },
//         { storeId: 's1', productId: 'p2', price: 2.19, amount: 5 }
//       ]
//     };

//     try {
//       await writeAllToCSVs(example, './output/');
//       console.log('CSV files written to ./output/');
//     } catch (err) {
//       console.error('Failed to write CSVs:', err);
//       process.exitCode = 1;
//     }
//   })();
