type EqFilter = {
    eq: (column: string, value: string | boolean) => EqFilter;
};

export function publicCatalogProductQuery<T>(query: T): T {
    return (query as EqFilter)
        .eq("is_published", true)
        .eq("production_status", "published")
        .eq("moderation_status", "approved") as T;
}
