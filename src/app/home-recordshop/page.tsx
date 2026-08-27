import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import {
    ArrowRight,
    CalendarDays,
    ChevronRight,
    Instagram,
    MapPin,
    Menu,
    MessageCircle,
    PackageCheck,
    Pause,
    Play,
    Search,
    ShoppingBag,
    Star,
    Ticket,
    UserRound,
} from "lucide-react";
import teeImage from "@/images/category_tee.png";
import hoodieImage from "@/images/category_hoodie.png";
import tankImage from "@/images/category_tank.png";
import artistImage from "@/images/spank_1.jpg";
import styles from "./recordshop.module.css";

export const metadata: Metadata = {
    title: "Record Shop Homepage Concept | Merch Tent",
    description: "A bright, culture-led homepage concept for Merch Tent.",
};

const products: Array<{
    artist: string;
    name: string;
    price: string;
    image: StaticImageData;
    href: string;
    tone: string;
}> = [
    { artist: "Paperback", name: "Endless Summer Tee", price: "$49 AUD", image: teeImage, href: "/category/tees", tone: styles.red },
    { artist: "Mila Fairfax", name: "Better Days Hoodie", price: "$79 AUD", image: hoodieImage, href: "/category/hoodies", tone: styles.mint },
    { artist: "Losing Sleep", name: "Postal Tank", price: "$45 AUD", image: tankImage, href: "/category/tanks", tone: styles.yellow },
];

const cities = [
    { city: "Melbourne", artist: "Paperback", genre: "Indie pop", tone: styles.yellow },
    { city: "Sydney", artist: "Mila Fairfax", genre: "Bedroom pop", tone: styles.red },
    { city: "Brisbane", artist: "Losing Sleep", genre: "Indie rock", tone: styles.blue },
    { city: "Perth", artist: "Westgate", genre: "Indie house", tone: styles.mint },
];

const tourDates = [
    { date: "04 SEP", artist: "Paperback", venue: "The Curtin", city: "Melbourne" },
    { date: "12 SEP", artist: "Mila Fairfax", venue: "Oxford Art Factory", city: "Sydney" },
    { date: "19 SEP", artist: "Losing Sleep", venue: "The Brightside", city: "Brisbane" },
    { date: "27 SEP", artist: "Westgate", venue: "The Rechabite", city: "Perth" },
];

export default function RecordShopHomepage() {
    return (
        <main className={`${styles.recordshopPage} recordshop-page`}>
            <header className={styles.header}>
                <Link href="/home-recordshop" className={styles.wordmark}>MERCH TENT</Link>
                <nav className={styles.desktopNav} aria-label="Record shop concept navigation">
                    <Link href="/new">Shop</Link>
                    <Link href="/artists">Artists</Link>
                    <a href="#cities">Cities</a>
                    <a href="#artists">How it works</a>
                </nav>
                <div className={styles.headerTools}>
                    <label className={styles.search}>
                        <span className="sr-only">Search artists and merchandise</span>
                        <input placeholder="Search artists, music, merch…" />
                        <Search size={20} aria-hidden />
                    </label>
                    <Link href="/account" className={styles.iconLink} aria-label="Account"><UserRound size={21} /></Link>
                    <Link href="/cart" className={styles.bag}><ShoppingBag size={20} /> <span>Bag (0)</span></Link>
                    <details className={styles.mobileMenu}>
                        <summary aria-label="Open menu"><Menu size={24} /></summary>
                        <nav><Link href="/new">Shop</Link><Link href="/artists">Artists</Link><a href="#cities">Cities</a><a href="#artists">How it works</a></nav>
                    </details>
                </div>
            </header>

            <section className={styles.hero}>
                <div className={styles.heroCopy}>
                    <p className={styles.eyebrow}>Independent music, made wearable.</p>
                    <h1>Find your next <em>favourite artist.</em> Wear them.</h1>
                    <div className={styles.heroActions}>
                        <Link href="/new" className={styles.primaryButton}>Shop new drops <ArrowRight size={18} /></Link>
                        <Link href="/start" className={styles.redButton}>Start selling <ArrowRight size={18} /></Link>
                    </div>
                </div>
                <div className={styles.heroPhoto}>
                    <Image src={artistImage} alt="Independent band performing together" fill priority sizes="(max-width: 900px) 100vw, 42vw" />
                    <span className={styles.photoLabel}>Live from the local scene</span>
                </div>
                <div className={styles.heroAside}>
                    <div className={styles.miniMerch}>
                        <Image src={teeImage} alt="Featured band T-shirt" fill sizes="220px" />
                        <span>Drop 024</span>
                    </div>
                    <div className={styles.player}>
                        <p>Now playing</p>
                        <div className={styles.playerRow}>
                            <div className={styles.albumArt}>MF</div>
                            <div><strong>Mila Fairfax</strong><span>Better Days · 03:42</span></div>
                            <button aria-label="Pause Better Days"><Pause size={18} fill="currentColor" /></button>
                        </div>
                        <div className={styles.waveform} aria-hidden>{Array.from({ length: 30 }).map((_, i) => <i key={i} style={{ height: `${8 + ((i * 13) % 25)}px` }} />)}</div>
                    </div>
                </div>
            </section>

            <div className={styles.ticker} aria-label="Latest drops">
                <strong>Live</strong><span>New drops</span><span>● Paperback — Endless Summer Tee</span><span>● Mila Fairfax — Better Days</span><span>● Cassia — Bloom Hoodie</span>
            </div>

            <section className={styles.drops}>
                <div className={styles.sectionIntro}>
                    <p>New this week</p><h2>Fresh from<br />the scene</h2>
                    <Link href="/new">Shop all new drops <ArrowRight size={17} /></Link>
                </div>
                {products.map((product) => (
                    <Link href={product.href} className={styles.productCard} key={product.name}>
                        <div className={`${styles.productImage} ${product.tone}`}>
                            <Image src={product.image} alt={product.name} fill sizes="(max-width: 700px) 50vw, 22vw" />
                            <span>New</span>
                        </div>
                        <div className={styles.productMeta}>
                            <p>{product.artist}</p><h3>{product.name}</h3><strong>{product.price}</strong>
                        </div>
                    </Link>
                ))}
            </section>

            <section className={styles.citySection} id="cities">
                <div className={styles.cityHeading}>
                    <p>Discover by city</p>
                    <h2>Support local scenes across Australia.</h2>
                    <Link href="/artists">View all artists <ArrowRight size={17} /></Link>
                </div>
                <div className={styles.cityGrid}>
                    {cities.map((item, index) => (
                        <Link href="/artists" className={styles.cityCard} key={item.city}>
                            <div className={`${styles.cityPortrait} ${item.tone}`}>
                                <span className={styles.cityTag}>{item.city}</span>
                                <div className={styles.portraitType} aria-hidden>{String(index + 1).padStart(2, "0")}</div>
                                <button tabIndex={-1} aria-hidden><Play size={17} fill="currentColor" /></button>
                            </div>
                            <strong>{item.artist}</strong><span>{item.genre}</span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className={styles.collections}>
                <div className={styles.collectionTitle}>
                    <p>Shop by format</p>
                    <h2>The staples.<br />Turned up.</h2>
                    <p>Artist-made pieces designed for everyday rotation—not a souvenir drawer.</p>
                </div>
                <Link href="/category/tees" className={`${styles.collectionCard} ${styles.yellow}`}>
                    <span>01 / Tees</span><strong>Front row<br />favourites.</strong>
                    <Image src={teeImage} alt="Shop artist tees" fill sizes="(max-width: 800px) 100vw, 33vw" />
                    <b>Shop tees <ArrowRight size={18} /></b>
                </Link>
                <Link href="/category/hoodies" className={`${styles.collectionCard} ${styles.mint}`}>
                    <span>02 / Hoodies</span><strong>For the<br />late set.</strong>
                    <Image src={hoodieImage} alt="Shop artist hoodies" fill sizes="(max-width: 800px) 100vw, 33vw" />
                    <b>Shop hoodies <ArrowRight size={18} /></b>
                </Link>
            </section>

            <section className={styles.featureStory}>
                <div className={styles.storyImage}>
                    <Image src={artistImage} alt="Featured independent artist" fill sizes="(max-width: 900px) 100vw, 52vw" />
                    <span>Artist cover story · 024</span>
                </div>
                <div className={styles.storyCopy}>
                    <p>Artist of the week</p>
                    <h2>Paperback</h2>
                    <blockquote>“We wanted the merch to feel like the record—sun-faded, immediate and a little bit lived in.”</blockquote>
                    <div className={styles.storyDetails}>
                        <span>Melbourne</span><span>Indie pop</span><span>Est. 2024</span>
                    </div>
                    <p className={styles.storyBody}>Meet the four friends turning bright guitar music into a small universe of records, shows and objects worth keeping.</p>
                    <div className={styles.storyActions}><Link href="/artists">Meet the artist <ArrowRight size={17} /></Link><Link href="/new">Shop their drop</Link></div>
                </div>
            </section>

            <section className={styles.bundle}>
                <div className={styles.bundleCopy}>
                    <p>Two artists. One parcel.</p>
                    <h2>Build a<br />double bill.</h2>
                    <p>Pick any two tees from independent artists and save on the pair. Your new favourites, on one bill.</p>
                    <div><span>2 × artist tees</span><strong>$85 AUD</strong></div>
                    <Link href="/new">Build your bundle <ArrowRight size={19} /></Link>
                </div>
                <div className={styles.bundleVisual}>
                    <div className={styles.vinyl}><i /><span>MT<br />02</span></div>
                    <div className={styles.bundleShirtOne}><Image src={teeImage} alt="First bundle tee" fill sizes="340px" /></div>
                    <div className={styles.bundleShirtTwo}><Image src={tankImage} alt="Second bundle tee" fill sizes="340px" /></div>
                </div>
            </section>

            <section className={styles.fanSection}>
                <div className={styles.fanHeading}>
                    <p>Fan frequency</p><h2>From the people<br />in the front row.</h2>
                    <MessageCircle size={50} strokeWidth={1.3} />
                </div>
                {[
                    ["The shirt arrived before the Sydney show and the print feels incredible.", "Alex · Sydney", "Paperback tee"],
                    ["Found a band, bought the drop, then saw them live a week later. That’s the whole point.", "Riley · Melbourne", "Mila Fairfax cap"],
                    ["It feels like supporting the artist, not just buying another anonymous black tee.", "Sam · Brisbane", "Losing Sleep hoodie"],
                ].map(([quote, name, item]) => <article key={name} className={styles.fanCard}>
                    <div>{Array.from({length:5}).map((_,i)=><Star key={i} size={15} fill="currentColor" />)}</div>
                    <blockquote>“{quote}”</blockquote><strong>{name}</strong><span>{item}</span>
                </article>)}
            </section>

            <section className={styles.tourSection}>
                <div className={styles.tourHeading}><p>Out in the real world</p><h2>On this month.</h2><CalendarDays size={42} /></div>
                <div className={styles.tourList}>
                    {tourDates.map((show) => <article key={show.artist} className={styles.tourRow}>
                        <time>{show.date}</time><strong>{show.artist}</strong><span><MapPin size={15} />{show.venue}, {show.city}</span>
                        <Link href="/artists" aria-label={`View tickets for ${show.artist}`}><Ticket size={17} /> Tickets</Link>
                    </article>)}
                </div>
            </section>

            <section className={styles.journalSection}>
                <div className={styles.journalHeading}><p>Merch Tent Journal</p><h2>Stories behind<br />the shirts.</h2><Link href="/journal">View all stories <ArrowRight size={17} /></Link></div>
                <article className={styles.leadStory}>
                    <div className={styles.leadStoryImage}><Image src={artistImage} alt="Band preparing for a show" fill sizes="(max-width: 800px) 100vw, 48vw" /></div>
                    <span>Scene report · 7 min read</span><h3>The rooms keeping Australia’s next wave loud</h3><Link href="/journal">Read story <ArrowRight size={17} /></Link>
                </article>
                <div className={styles.smallStories}>
                    <article className={styles.blue}><span>Artist advice · 5 min</span><h3>How to make your first merch drop mean something</h3><Link href="/start">Read story <ArrowRight size={16} /></Link></article>
                    <article className={styles.red}><span>Inside the process · 3 min</span><h3>Why printing after the order changes the equation</h3><Link href="/sustainability">Read story <ArrowRight size={16} /></Link></article>
                </div>
            </section>

            <section className={styles.artistCta} id="artists">
                <div className={styles.ctaIcon}><PackageCheck size={54} strokeWidth={1.5} /></div>
                <div><p>For artists</p><h2>Made after<br />they order.</h2></div>
                <div className={styles.ctaCopy}>
                    <p>No stock. No upfront cost.<br />More money back to artists.</p>
                    <div className={styles.steps}><span>01 Upload</span><ChevronRight size={16} /><span>02 Launch</span><ChevronRight size={16} /><span>03 We ship</span></div>
                    <Link href="/start">How it works <ArrowRight size={18} /></Link>
                </div>
            </section>

            <section className={styles.newsletter}>
                <div><Instagram size={30} /><p>@merchtent.au</p><span>New artists, first samples and show-night dispatches.</span></div>
                <div className={styles.newsletterCopy}><p>Get on the list</p><h2>Hear it first.<br />Wear it next.</h2></div>
                <form className={styles.newsletterForm}>
                    <label htmlFor="recordshop-email">Email address</label>
                    <div><input id="recordshop-email" type="email" placeholder="you@email.com" required /><button type="submit">Join the list <ArrowRight size={18} /></button></div>
                    <small>Monthly drops, artist stories and local show picks. No noise.</small>
                </form>
            </section>

            <footer className={styles.footer}>
                <strong>MERCH TENT</strong><span>Independent music, made wearable.</span>
                <div><Link href="/artists">Artists</Link><Link href="/start">Sell merch</Link><Link href="/sustainability">Sustainability</Link></div>
            </footer>
        </main>
    );
}
