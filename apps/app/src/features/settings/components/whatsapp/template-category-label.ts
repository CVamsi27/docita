/** Resolve a WhatsApp template category to a translated label (WhatsApp.templateCategories). */
export function templateCategoryLabel(
  category: string,
  t: (key: string) => string,
): string {
  switch (category) {
    case "FOLLOW_UP":
      return t("templateCategories.followUp");
    case "APPOINTMENT":
      return t("templateCategories.appointment");
    case "PRESCRIPTION":
      return t("templateCategories.prescription");
    case "INVOICE":
      return t("templateCategories.invoice");
    case "PAYMENT":
      return t("templateCategories.payment");
    case "MARKETING":
      return t("templateCategories.marketing");
    default:
      return category;
  }
}
