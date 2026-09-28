"use client";

export default function PrivacyChoicesButton() {
    return (
        <button
            type="button"
            className="hover:text-white"
            onClick={() => window.dispatchEvent(new Event("merch-tent:open-consent"))}
        >
            Privacy choices
        </button>
    );
}
