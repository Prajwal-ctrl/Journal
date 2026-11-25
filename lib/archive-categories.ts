const builtInCategories = new Set([
  "journal",
  "memory",
  "mistake",
  "lesson",
  "reflection",
  "future",
]);

const customCategoryPattern = /^custom_[a-z0-9_]{1,40}$/;

export function isValidArchiveCategory(value: string) {
  return builtInCategories.has(value) || customCategoryPattern.test(value);
}

