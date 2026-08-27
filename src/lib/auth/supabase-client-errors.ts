type SupabaseClientError = {
    message?: string;
    status?: number;
    code?: string;
};

export function passwordResetErrorMessage(error: SupabaseClientError) {
    const code = error.code?.toLowerCase() ?? "";
    const message = error.message?.toLowerCase() ?? "";

    if (
        error.status === 429 ||
        code.includes("rate") ||
        message.includes("rate limit") ||
        message.includes("too many")
    ) {
        return "Too many password emails were requested. Please wait a few minutes, then try again.";
    }

    return "Could not send password setup email. Please try again.";
}
