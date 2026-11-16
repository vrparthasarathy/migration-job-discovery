function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function useCaseId(vendor: string, name: string): string | undefined {
  const vendorSlug = slug(vendor);
  const nameSlug = slug(name);
  if (vendorSlug === "" || nameSlug === "") return undefined;
  return `uc-${vendorSlug}-${nameSlug}`;
}
