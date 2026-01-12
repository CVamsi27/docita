
import { useState } from "react";

export type FeedbackType = "bug" | "feature" | "general";

export interface FeedbackData {
    rating: number;
    message: string;
    type: FeedbackType;
}

export const useFeedbackLogic = (onSubmit?: (feedback: FeedbackData) => void) => {
    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState("");
    const [type, setType] = useState<FeedbackType>("general");

    const handleSubmit = () => {
        if (onSubmit) {
            onSubmit({ rating, message, type });
        }
        // Reset form
        setRating(0);
        setMessage("");
        setType("general");
    };

    return {
        rating,
        setRating,
        message,
        setMessage,
        type,
        setType,
        handleSubmit,
    };
};
