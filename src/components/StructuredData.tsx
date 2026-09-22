type StructuredDataValue = Record<string, unknown> | Array<Record<string, unknown>>;

export default function StructuredData({ data }: { data: StructuredDataValue }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, "\\u003c"),
            }}
        />
    );
}
