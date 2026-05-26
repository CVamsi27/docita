import { useAPIMutation } from "@/lib/api/api-core";

export const useCreateContactInquiry = () =>
  useAPIMutation<
    Record<string, unknown>,
    {
      name: string;
      email: string;
      clinic?: string;
      message: string;
    }
  >("/contact/inquiry", "POST");
