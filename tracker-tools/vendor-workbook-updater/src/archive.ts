/** 1980-01-01 in the zip's DOS date field, the earliest date a zip can hold. */
const FIXED_DATE = 0x21;
const FIXED_TIME = 0;
const END_OF_DIRECTORY = Buffer.from([0x50, 0x4b, 0x05, 0x06]);

/**
 * Returns a copy of a zip with every entry's modification time and date fixed.
 * The library stamps each entry with the clock; nothing else in its output varies, so this makes the bytes repeatable.
 */
export function fixedZip(zip: Buffer): Buffer {
  const out = Buffer.from(zip);
  const end = out.lastIndexOf(END_OF_DIRECTORY);
  if (end < 0) throw new Error("not a zip archive");
  const entries = out.readUInt16LE(end + 10);
  let central = out.readUInt32LE(end + 16);
  for (let i = 0; i < entries; i++) {
    out.writeUInt16LE(FIXED_TIME, central + 12);
    out.writeUInt16LE(FIXED_DATE, central + 14);
    const local = out.readUInt32LE(central + 42);
    out.writeUInt16LE(FIXED_TIME, local + 10);
    out.writeUInt16LE(FIXED_DATE, local + 12);
    central += 46 + out.readUInt16LE(central + 28) + out.readUInt16LE(central + 30) + out.readUInt16LE(central + 32);
  }
  return out;
}
