import { getServerSupabase } from "@/lib/supabase/server";

export default async function OrdersPage() {
    const supabase = getServerSupabase();

    const { data: orders, error } = await supabase
        .from("orders")
        .select(`
            id,
            created_at,
            total_amount,
            currency,
            status,
            customer_email,
            tracking_number,
            order_items (
                id,
                product_title,
                quantity
            )
        `)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return <div>Error loading orders</div>;
    }

    return (
        <div>
            <h1>Orders</h1>

            <table
                style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: 20,
                }}
            >
                <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
                        <th style={{ padding: 8 }}>Order</th>
                        <th style={{ padding: 8 }}>Date</th>
                        <th style={{ padding: 8 }}>Customer</th>
                        <th style={{ padding: 8 }}>Total</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Tracking</th>
                        <th style={{ padding: 8 }}>Items</th>
                    </tr>
                </thead>

                <tbody>
                    {orders?.map((order) => (
                        <tr
                            key={order.id}
                            style={{ borderBottom: "1px solid #f0f0f0" }}
                        >
                            <td style={{ padding: 8 }}>#{order.id}</td>

                            <td style={{ padding: 8 }}>
                                {new Date(order.created_at).toLocaleString()}
                            </td>

                            <td style={{ padding: 8 }}>
                                {order.customer_email || "-"}
                            </td>

                            <td style={{ padding: 8 }}>
                                {order.currency} {(order.total_amount / 100).toFixed(2)}
                            </td>

                            <td style={{ padding: 8 }}>
                                <span
                                    style={{
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        background:
                                            order.status === "shipped"
                                                ? "#d4edda"
                                                : order.status === "in_production"
                                                    ? "#fff3cd"
                                                    : "#eee",
                                    }}
                                >
                                    {order.status}
                                </span>
                            </td>

                            <td style={{ padding: 8 }}>
                                {order.tracking_number || "-"}
                            </td>

                            <td style={{ padding: 8 }}>
                                {order.order_items?.map((item) => (
                                    <div key={item.id}>
                                        {item.product_title} x {item.quantity}
                                    </div>
                                ))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}