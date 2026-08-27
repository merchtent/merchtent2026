import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  CircleUserRound,
  CloudUpload,
  Globe2,
  Heart,
  Instagram,
  Menu,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import heroImage from "@/images/spank_1.jpg";
import teeImage from "@/images/category_tee.png";
import tankImage from "@/images/category_tank.png";
import hoodieImage from "@/images/category_hoodie.png";
import journalImage from "@/images/journal.png";
import styles from "./home-white.module.css";

export const metadata: Metadata = {
  title: "Merch Tent — Wear the music. Back the artist.",
  description: "Official merch from independent artists, made when you order.",
};

const products: Array<{
  name: string;
  artist: string;
  price: string;
  image: StaticImageData;
  accent: string;
}> = [
  { name: "After Hours Tee", artist: "Spank The 90s", price: "$55 AUD", image: teeImage, accent: "New" },
  { name: "Side Stage Tank", artist: "Merch Tent Editions", price: "$45 AUD", image: tankImage, accent: "Limited" },
  { name: "Load Out Hoodie", artist: "Spank The 90s", price: "$90 AUD", image: hoodieImage, accent: "New" },
];

const artists = ["SPANK THE 90s", "TEEN JESUS", "SPEED", "GENESIS OWUSU", "THE BUOYS", "KING STINGRAY"];

export default function HomeWhitePage() {
  return (
    <main className={`${styles.homeWhite} ${styles.paper}`}>
      <div className={styles.announcement}>Free shipping Australia-wide over $100</div>

      <header className={styles.header}>
        <Link href="/home-white" className={styles.wordmark} aria-label="Merch Tent home">
          MERCH TENT
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          <Link href="/new">Shop</Link>
          <Link href="/artists">Artists</Link>
          <Link href="/new">New drops</Link>
          <Link href="/journal">Journal</Link>
        </nav>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Search"><Search /></button>
          <Link href="/start" className={styles.artistLink}>For artists</Link>
          <Link href="/cart" aria-label="Shopping bag" className={styles.bag}><ShoppingBag /><span>0</span></Link>
          <button type="button" className={styles.menu} aria-label="Open menu"><Menu /></button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.verticalNote}><Globe2 /> <span>Support local<br />Keep music live</span></div>
          <p className={styles.eyebrow}><Sparkles /> Official artist merch</p>
          <h1>Wear the music.<br /><span>Back the artist.</span></h1>
          <p className={styles.lede}>Official merch from independent artists. Made when you order. Paid back to the people who made the noise.</p>
          <div className={styles.heroButtons}>
            <Link href="/new" className={styles.primaryButton}>Shop new drops <ArrowRight /></Link>
            <Link href="/start" className={styles.secondaryButton}>Start your store <ArrowDownRight /></Link>
          </div>
          <div className={styles.heroProof}>
            <span><strong>100%</strong> official merch</span>
            <span><strong>0</strong> stock risk</span>
            <span><strong>AU</strong> artist-first</span>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <Image src={heroImage} alt="Independent band performing live" fill priority sizes="(max-width: 900px) 100vw, 56vw" />
          <div className={styles.imageWash} />
          <div className={styles.dropTag}><span>Drop 014</span><strong>Live now</strong></div>
          <div className={styles.featureCard}>
            <div>
              <p>Artist on rotation</p>
              <strong>Spank The 90s</strong>
            </div>
            <Link href="/artists" aria-label="View featured artist"><ArrowRight /></Link>
          </div>
        </div>
      </section>

      <div className={styles.artistTicker}>
        <span className={styles.tickerLabel}>Artists on rotation <Zap /></span>
        <div className={styles.tickerTrack}>{artists.map((artist) => <span key={artist}>{artist} <i>/</i></span>)}</div>
      </div>

      <section className={styles.shopSection}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>01 / New releases</p>
          <h2>Fresh from<br />the scene.</h2>
          <p>New drops from independent artists across Australia. Every piece made for you, after you order.</p>
          <Link href="/new">Shop all new drops <ArrowRight /></Link>
        </div>
        <div className={styles.productGrid}>
          {products.map((product) => (
            <article className={styles.productCard} key={product.name}>
              <Link href="/new" className={styles.productImage}>
                <Image src={product.image} alt={product.name} fill sizes="(max-width: 760px) 100vw, 25vw" />
                <span className={styles.newTag}>{product.accent}</span>
                <span className={styles.quickShop}>Quick shop <ArrowRight /></span>
              </Link>
              <div className={styles.productInfo}>
                <div><h3>{product.name}</h3><p>{product.artist}</p></div>
                <strong>{product.price}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.processSection}>
        <div className={styles.processTitle}>
          <p className={styles.eyebrow}>Built for artists</p>
          <h2>No stock.<br />No waste.<br /><span>All signal.</span></h2>
          <p>Bring the art. We&apos;ll take care of the rest.</p>
        </div>
        <div className={styles.processSteps}>
          <article><span>01</span><CloudUpload /><div><h3>Upload your art</h3><p>Choose your products and turn the idea into a live drop.</p></div></article>
          <article><span>02</span><PackageCheck /><div><h3>We make &amp; ship</h3><p>Every item is made to order and shipped directly to your fans.</p></div></article>
          <article><span>03</span><WalletCards /><div><h3>You get paid</h3><p>Earn from every sale, without boxes, overheads or guesswork.</p></div></article>
        </div>
        <Link href="/start" className={styles.processCta}>Launch your first drop <ArrowRight /></Link>
      </section>

      <section className={styles.editorialSection}>
        <div className={styles.editorialImage}>
          <Image src={journalImage} alt="Stories from independent music" fill sizes="(max-width: 800px) 100vw, 50vw" />
          <span>From the journal</span>
        </div>
        <div className={styles.editorialCopy}>
          <p className={styles.eyebrow}>02 / Scene report</p>
          <h2>The merch table is part of the show.</h2>
          <p>Meet the artists, designers and venues building Australia&apos;s independent music culture—one room, one record and one shirt at a time.</p>
          <Link href="/journal">Read the latest story <ArrowRight /></Link>
        </div>
      </section>

      <section className={styles.communitySection}>
        <div><Heart /><p>Back the people<br />who make the noise.</p></div>
        <div className={styles.communityCta}>
          <p>New drops, artist stories and first access. No filler.</p>
          <form><label className="sr-only" htmlFor="home-white-email">Email address</label><input id="home-white-email" type="email" placeholder="EMAIL ADDRESS" /><button type="submit" aria-label="Join mailing list"><ArrowRight /></button></form>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><Link href="/home-white" className={styles.footerMark}>MERCH<br />TENT</Link><p>Built for artists.<br />Backed by fans.</p></div>
        <div className={styles.footerLinks}>
          <div><span>Shop</span><Link href="/new">New drops</Link><Link href="/artists">Artists</Link><Link href="/categories">Categories</Link></div>
          <div><span>About</span><Link href="/about">Our story</Link><Link href="/start">For artists</Link><Link href="/sustainability">Sustainability</Link></div>
          <div><span>Follow</span><Link href="https://www.instagram.com/merchtent.au/"><Instagram /> Instagram</Link><Link href="/account"><CircleUserRound /> Account</Link></div>
        </div>
        <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Merch Tent</span><span>Always keep music live.</span></div>
      </footer>
    </main>
  );
}
