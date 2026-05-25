import { useAPIMutation } from "../core/use-api-mutation";

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
