import { useAPIMutation } from "../../lib/api-core";

export const useCreateContactInquiry = () =>
    useAPIMutation<
        unknown,
        {
            name: string;
            email: string;
            clinic?: string;
            message: string;
        }
    >("/contact/inquiry", "POST");
