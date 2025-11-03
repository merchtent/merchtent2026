// import Image from "next/image";

// export default function Home() {
//   return (
//     <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
//       <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
//         <Image
//           className="dark:invert"
//           src="/next.svg"
//           alt="Next.js logo"
//           width={180}
//           height={38}
//           priority
//         />
//         <ol className="font-mono list-inside list-decimal text-sm/6 text-center sm:text-left">
//           <li className="mb-2 tracking-[-.01em]">
//             Get started by editing{" "}
//             <code className="bg-black/[.05] dark:bg-white/[.06] font-mono font-semibold px-1 py-0.5 rounded">
//               src/app/page.tsx
//             </code>
//             .
//           </li>
//           <li className="tracking-[-.01em]">
//             Save and see your changes instantly.
//           </li>
//         </ol>

//         <div className="flex gap-4 items-center flex-col sm:flex-row">
//           <a
//             className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
//             href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             <Image
//               className="dark:invert"
//               src="/vercel.svg"
//               alt="Vercel logomark"
//               width={20}
//               height={20}
//             />
//             Deploy now
//           </a>
//           <a
//             className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
//             href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//             target="_blank"
//             rel="noopener noreferrer"
//           >
//             Read our docs
//           </a>
//         </div>
//       </main>
//       <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/file.svg"
//             alt="File icon"
//             width={16}
//             height={16}
//           />
//           Learn
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/window.svg"
//             alt="Window icon"
//             width={16}
//             height={16}
//           />
//           Examples
//         </a>
//         <a
//           className="flex items-center gap-2 hover:underline hover:underline-offset-4"
//           href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           <Image
//             aria-hidden
//             src="/globe.svg"
//             alt="Globe icon"
//             width={16}
//             height={16}
//           />
//           Go to nextjs.org →
//         </a>
//       </footer>
//     </div>
//   );
// }

// src/app/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import { publicImageUrl } from "@/lib/storage";
import Link from 'next/link';
import ShopOnePage from "@/components/shop/Home";

export const revalidate = 60; // ISR: refresh product list every 60s

type Product = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  primary_image_path: string;
};

async function getProducts(): Promise<Product[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('products_with_first_image')
    .select('id, title, description, price_cents, currency, primary_image_path')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    // <main className="p-6 max-w-5xl mx-auto">
    //   <h1 className="text-3xl font-bold mb-6">Shop</h1>

    //   {products.length === 0 ? (
    //     <p className="text-muted-foreground">No products yet.</p>
    //   ) : (
    //     <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    //       {products.map(p => (
    //         <li key={p.id} className="border rounded-2xl p-4 hover:shadow">
    //           <Link href={`/product/${p.id}`}>
    //             <div className="space-y-2">
    //               {p.primary_image_path ? (
    //                 <img
    //                   src={publicImageUrl(p.primary_image_path)}
    //                   alt={p.title}
    //                   width={600}
    //                   height={600}
    //                   className="rounded-xl aspect-square object-cover bg-gray-100"
    //                 />
    //               ) : (
    //                 <div className="rounded-xl aspect-square bg-gray-100" />
    //               )}
    //               <h2 className="text-xl font-semibold">{p.title}</h2>
    //               <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
    //               <p className="font-medium">
    //                 {(p.price_cents / 100).toLocaleString(undefined, { style: 'currency', currency: p.currency })}
    //               </p>
    //             </div>
    //           </Link>
    //         </li>
    //       ))}
    //     </ul>
    //   )}
    // </main>
    <ShopOnePage />
  );
}
