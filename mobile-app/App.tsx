import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as ImagePicker from 'expo-image-picker';
import { Button, Field, Message, SectionTitle } from './src/ui';
import { productImage, siteUrl, supabase } from './src/supabase';
import { theme } from './src/theme';

type Tab = 'shop' | 'products' | 'create' | 'credits' | 'orders' | 'account';
type Profile = { account_type: string | null; onboarding_completed: boolean | null };
type Artist = { id: string; display_name: string };
type ArtistProduct = {
  id: string; title: string; description: string | null; price_cents: number; is_published: boolean;
  moderation_status: string | null; production_status: string | null; fulfillment_flow: string | null;
  product_images?: { path: string; sort_order: number }[];
};
type ShopProduct = { id: string; title: string; price: number; image: string; badge: string; slug: string; category: string | null; sizes: string[]; colors: { hex: string; label: string }[] };
type CreditRow = { id: string; points: number; description: string | null; created_at: string };
type OrderRow = { id: string; created_at: string; status: string | null; subtotal_cents: number | null };

const money = (cents: number) => `A$${(cents / 100).toFixed(2)}`;
const date = (value: string) => new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tab, setTab] = useState<Tab>('shop');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => setSession(current));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) { setProfile(null); setArtist(null); setTab('shop'); return; }
    let current = true;
    Promise.all([
      supabase.from('profiles').select('account_type,onboarding_completed').eq('id', userId).maybeSingle(),
      supabase.from('artists').select('id,display_name').eq('user_id', userId).maybeSingle(),
    ]).then(([profileResult, artistResult]) => {
      if (!current) return;
      setProfile(profileResult.data);
      setArtist(artistResult.data);
      setTab(profileResult.data?.account_type === 'artist' ? 'products' : 'shop');
    });
    return () => { current = false; };
  }, [session?.user.id]);

  const isArtist = profile?.account_type === 'artist' && profile.onboarding_completed && Boolean(artist);
  const tabs: { key: Tab; label: string }[] = [
    { key: 'shop', label: 'Shop' },
    ...(isArtist ? [{ key: 'products' as Tab, label: 'Products' }, { key: 'create' as Tab, label: 'Create' }] : []),
    ...(session ? [{ key: 'credits' as Tab, label: 'Credits' }, { key: 'orders' as Tab, label: 'Orders' }] : []),
    { key: 'account', label: 'Account' },
  ];

  if (!ready) return <SafeAreaView style={styles.root}><Text style={styles.loading}>MERCH TENT</Text></SafeAreaView>;
  return <SafeAreaView style={styles.root}>
    <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
    <View style={styles.header}>
      <Text style={styles.brand}>MERCH TENT</Text>
      <Text style={styles.headerRight}>{artist?.display_name || 'LIVE MERCH'}</Text>
    </View>
    <View style={styles.body}>
      {tab === 'shop' && <ShopScreen key="shop" />}
      {tab === 'products' && isArtist && artist && session && <ProductsScreen artist={artist} session={session} onCreate={() => setTab('create')} />}
      {tab === 'create' && isArtist && artist && session && <CreateScreen artist={artist} session={session} onCreated={() => setTab('products')} />}
      {tab === 'credits' && session && <CreditsScreen userId={session.user.id} />}
      {tab === 'orders' && session && <OrdersScreen userId={session.user.id} />}
      {tab === 'account' && <AccountScreen session={session} profile={profile} />}
    </View>
    <View style={styles.tabs}>
      {tabs.map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: tab === item.key }}
        onPress={() => setTab(item.key)} style={[styles.tab, tab === item.key && styles.activeTab]}>
        <Text style={[styles.tabText, tab === item.key && { color: theme.lime }]}>{item.label.toUpperCase()}</Text>
      </Pressable>)}
    </View>
  </SafeAreaView>;
}

function ShopScreen() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!siteUrl) { setError('Set EXPO_PUBLIC_SITE_URL to your live website.'); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`${siteUrl}/api/products`);
      if (!response.ok) throw new Error('Could not load the shop.');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (caught) { setError(messageOf(caught)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (selected) return <ScrollView contentContainerStyle={styles.scroll}>
    <Pressable onPress={() => setSelected(null)}><Text style={[styles.link, { marginTop: 0, marginBottom: 20 }]}>← BACK TO SHOP</Text></Pressable>
    {selected.image.startsWith('http') ? <Image source={{ uri: selected.image }} style={styles.detailImage} /> : null}
    <Text style={styles.mini}>{selected.badge.toUpperCase()}</Text>
    <Text style={styles.detailTitle}>{selected.title.toUpperCase()}</Text>
    <Text style={[styles.price, { marginBottom: 24 }]}>{money(Math.round(selected.price * 100))}</Text>
    {selected.colors?.length ? <Text style={styles.muted}>Colours: {selected.colors.map(color => color.label).filter(Boolean).join(', ')}</Text> : null}
    {selected.sizes?.length ? <Text style={[styles.muted, { marginBottom: 24 }]}>Sizes: {selected.sizes.join(' · ')}</Text> : null}
    <Button title="Choose options and buy" onPress={() => siteUrl && Linking.openURL(`${siteUrl}/product/${encodeURIComponent(selected.id)}`)} />
    <Text style={styles.muted}>Product options and secure checkout open in your browser.</Text>
  </ScrollView>;
  return <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.lime} />} contentContainerStyle={styles.scroll}>
    <SectionTitle eyebrow="Shop" title="Merch from the scene." subtitle="Discover artist drops and shop directly from your phone." />
    {error ? <Message text={error} error /> : null}
    {products.map(product => <Pressable key={product.id} style={styles.card}
      onPress={() => setSelected(product)}>
      {product.image.startsWith('http') ? <Image source={{ uri: product.image }} style={styles.shopImage} /> : null}
      <View style={styles.cardBody}>
        <Text style={styles.mini}>{product.badge.toUpperCase()}</Text>
        <Text style={styles.cardTitle}>{product.title}</Text>
        <Text style={styles.price}>{money(Math.round(product.price * 100))}</Text>
        <Text style={styles.link}>VIEW PRODUCT →</Text>
      </View>
    </Pressable>)}
    {!loading && !error && products.length === 0 ? <Text style={styles.muted}>No products available yet.</Text> : null}
  </ScrollView>;
}

function ProductsScreen({ artist, session, onCreate }: { artist: Artist; session: Session; onCreate: () => void }) {
  const [products, setProducts] = useState<ArtistProduct[]>([]);
  const [selected, setSelected] = useState<ArtistProduct | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('products')
      .select('id,title,description,price_cents,is_published,moderation_status,production_status,fulfillment_flow,product_images(path,sort_order)')
      .eq('artist_id', artist.id).order('created_at', { ascending: false });
    if (queryError) setError('Could not load your products.');
    else setProducts((data || []) as ArtistProduct[]);
    setLoading(false);
  }, [artist.id]);
  useEffect(() => { void load(); }, [load]);
  if (selected) return <EditProductScreen product={selected} session={session} onBack={() => setSelected(null)}
    onSaved={() => { setSelected(null); void load(); }} />;
  return <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.lime} />} contentContainerStyle={styles.scroll}>
    <SectionTitle eyebrow="Artist dashboard" title="Your products." subtitle="Drafts, reviews, and published merch in one place." />
    <Button title="Create a product" onPress={onCreate} />
    {error ? <Message text={error} error /> : null}
    {products.map(product => {
      const image = productImage([...product.product_images || []].sort((a,b) => a.sort_order - b.sort_order)[0]?.path);
      return <Pressable key={product.id} style={styles.productRow} onPress={() => {
        if (product.fulfillment_flow === 'manual_fulfillment') setSelected(product);
        else if (siteUrl) void Linking.openURL(`${siteUrl}/dashboard/products/${encodeURIComponent(product.id)}/edit`);
      }}>
        {image ? <Image source={{ uri: image }} style={styles.thumb} /> : <View style={styles.thumb} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{product.title}</Text>
          <Text style={styles.price}>{money(product.price_cents)}</Text>
          <Text style={styles.mini}>{product.moderation_status === 'approved' ? 'LIVE IN SHOP' :
            product.moderation_status === 'pending_review' ? 'AWAITING REVIEW' :
            product.production_status === 'failed' ? 'NEEDS REVIEW' : 'DRAFT'}</Text>
          <Text style={styles.link}>{product.fulfillment_flow === 'manual_fulfillment' ? 'EDIT PRODUCT →' : 'OPEN DESIGNER PRODUCT →'}</Text>
        </View>
      </Pressable>;
    })}
    {!loading && !error && products.length === 0 ? <Text style={styles.muted}>Your first product starts with a photo.</Text> : null}
  </ScrollView>;
}

function EditProductScreen({ product, session, onBack, onSaved }: {
  product: ArtistProduct; session: Session; onBack: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || '');
  const [price, setPrice] = useState((product.price_cents / 100).toFixed(2));
  const [publish, setPublish] = useState(product.is_published);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (!siteUrl) { setError('Set EXPO_PUBLIC_SITE_URL first.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${siteUrl}/api/mobile/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, price, publish }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update product.');
      Alert.alert('Product updated', publish ? 'Your changes are awaiting review.' : 'Saved as a draft.');
      onSaved();
    } catch (caught) { setError(messageOf(caught)); }
    finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <Pressable onPress={onBack}><Text style={[styles.link, { marginTop: 0, marginBottom: 20 }]}>← BACK TO PRODUCTS</Text></Pressable>
    <SectionTitle eyebrow="Artist studio" title="Edit product." subtitle="Update the details and submit changes for review." />
    {error ? <Message text={error} error /> : null}
    <Field label="Product title" value={title} onChangeText={setTitle} />
    <Field label="Description" value={description} onChangeText={setDescription} multiline />
    <Field label="Price (AUD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
    <Pressable onPress={() => setPublish(value => !value)} style={styles.checkboxRow}>
      <View style={[styles.checkbox, publish && { backgroundColor: theme.lime }]} />
      <View style={{ flex: 1 }}><Text style={styles.cardTitle}>Submit for shop review</Text>
        <Text style={styles.muted}>Leave off to save a draft or take this product out of the shop.</Text></View>
    </Pressable>
    <Button title="Save changes" onPress={() => void save()} disabled={busy} />
  </ScrollView>;
}

function CreateScreen({ session, onCreated }: { artist: Artist; session: Session; onCreated: () => void }) {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('40');
  const [category, setCategory] = useState('tees');
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pick(camera: boolean) {
    const permission = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Photo permission is required to choose an image.'); return; }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!result.canceled) { setImage(result.assets[0]); setError(''); }
  }

  async function save() {
    if (!siteUrl) { setError('Set EXPO_PUBLIC_SITE_URL first.'); return; }
    if (!image || !title.trim() || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      setError('Add a photo, title, and valid price.'); return;
    }
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('category', category);
      form.append('price', price);
      form.append('publish', String(publish));
      form.append('image', {
        uri: image.uri,
        name: image.fileName || `merch-photo-${Date.now()}.jpg`,
        type: image.mimeType || 'image/jpeg',
      } as unknown as Blob);
      const response = await fetch(`${siteUrl}/api/mobile/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the product.');
      setImage(null); setTitle(''); setDescription(''); setPrice('40'); setPublish(false);
      Alert.alert('Product created', publish ? 'Submitted for review. It will appear in the shop after approval.' : 'Saved as a draft.');
      onCreated();
    } catch (caught) { setError(messageOf(caught)); }
    finally { setBusy(false); }
  }

  return <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <SectionTitle eyebrow="Artist studio" title="Create a product." subtitle="Take a photo or choose one, then prepare your new merch." />
    {error ? <Message text={error} error /> : null}
    {image ? <Image source={{ uri: image.uri }} style={styles.preview} /> : <View style={styles.photoPlaceholder}><Text style={styles.muted}>YOUR PRODUCT PHOTO</Text></View>}
    <View style={styles.buttonRow}>
      <View style={{ flex: 1 }}><Button title="Camera" secondary onPress={() => void pick(true)} /></View>
      <View style={{ flex: 1 }}><Button title="Gallery" secondary onPress={() => void pick(false)} /></View>
    </View>
    <Field label="Product title" value={title} onChangeText={setTitle} placeholder="Tonight's tour tee" />
    <Field label="Description" value={description} onChangeText={setDescription} placeholder="Tell fans about this item" multiline />
    <Field label="Price (AUD)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
    <Text style={styles.label}>CATEGORY</Text>
    <View style={styles.chips}>{['tees', 'hoodies', 'hats', 'posters', 'other'].map(value =>
      <Pressable key={value} onPress={() => setCategory(value)} style={[styles.chip, category === value && styles.chipActive]}>
        <Text style={[styles.chipText, category === value && { color: theme.bg }]}>{value.toUpperCase()}</Text>
      </Pressable>)}</View>
    <Pressable onPress={() => setPublish(value => !value)} style={styles.checkboxRow}>
      <View style={[styles.checkbox, publish && { backgroundColor: theme.lime }]} />
      <View style={{ flex: 1 }}><Text style={styles.cardTitle}>Submit for shop review</Text>
        <Text style={styles.muted}>The product becomes available after approval. Uncheck to save a draft.</Text></View>
    </Pressable>
    <Button title={busy ? 'Saving...' : publish ? 'Submit product' : 'Save draft'} onPress={() => void save()} disabled={busy} />
    <Text style={styles.muted}>For print-on-demand designs, the photo must still be prepared as a valid print asset before fulfilment. This form creates a manual product.</Text>
  </ScrollView>;
}

function CreditsScreen({ userId }: { userId: string }) {
  const [balance, setBalance] = useState(0);
  const [ledger, setLedger] = useState<CreditRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [balanceResult, ledgerResult] = await Promise.all([
      supabase.from('merch_credit_balances').select('points_balance').eq('user_id', userId).maybeSingle(),
      supabase.from('merch_credit_ledger').select('id,points,description,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    ]);
    if (balanceResult.error || ledgerResult.error) setError('Could not load credits.');
    else { setError(''); setBalance(balanceResult.data?.points_balance || 0); setLedger(ledgerResult.data || []); }
    setLoading(false);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.lime} />} contentContainerStyle={styles.scroll}>
    <SectionTitle eyebrow="Fan rewards" title="Merch credits." subtitle="Your purchases and rewards build here." />
    {error ? <Message text={error} error /> : null}
    <View style={styles.balance}><Text style={styles.balanceNumber}>{balance}</Text><Text style={styles.mini}>AVAILABLE CREDITS</Text></View>
    <Text style={styles.label}>RECENT ACTIVITY</Text>
    {ledger.map(row => <View key={row.id} style={styles.listRow}><Text style={styles.cardTitle}>{row.description || 'Credit update'}</Text>
      <Text style={styles.muted}>{date(row.created_at)} · {row.points > 0 ? '+' : ''}{row.points} points</Text></View>)}
    {ledger.length === 0 && !loading ? <Text style={styles.muted}>No credits activity yet.</Text> : null}
  </ScrollView>;
}

function OrdersScreen({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase.from('orders')
      .select('id,created_at,status,subtotal_cents').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(30);
    if (queryError) setError('Could not load orders.');
    else { setError(''); setOrders(data || []); }
    setLoading(false);
  }, [userId]);
  useEffect(() => { void load(); }, [load]);
  return <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.lime} />} contentContainerStyle={styles.scroll}>
    <SectionTitle eyebrow="Your purchases" title="Orders." subtitle="Keep track of the merch you've backed." />
    {error ? <Message text={error} error /> : null}
    {orders.map(order => <View key={order.id} style={styles.listRow}>
      <Text style={styles.cardTitle}>Order {order.id.slice(0, 8).toUpperCase()}</Text>
      <Text style={styles.muted}>{date(order.created_at)} · {order.status || 'Processing'}</Text>
      <Text style={styles.price}>{money(order.subtotal_cents || 0)}</Text>
    </View>)}
    {orders.length === 0 && !loading && !error ? <Text style={styles.muted}>No orders yet. Find your next favourite in the shop.</Text> : null}
  </ScrollView>;
}

function AccountScreen({ session, profile }: { session: Session | null; profile: Profile | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function signIn() {
    setBusy(true); setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (authError) setError('Could not sign in. Check your email and password.');
    setBusy(false);
  }
  return <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
    <SectionTitle eyebrow="Account" title={session ? 'Your profile.' : 'Sign in.'}
      subtitle={session ? 'One account across Merch Tent web and mobile.' : 'Access your products, orders, and rewards.'} />
    {error ? <Message text={error} error /> : null}
    {session ? <>
      <Text style={styles.cardTitle}>{session.user.email}</Text>
      <Text style={[styles.muted, { marginBottom: 28 }]}>{profile?.account_type === 'artist' ? 'Artist account' : 'Fan account'}</Text>
      {!profile?.onboarding_completed && siteUrl ? <Button title="Finish account setup" onPress={() => Linking.openURL(`${siteUrl}/account/setup`)} /> : null}
      <Button title="Sign out" secondary onPress={() => void supabase.auth.signOut()} />
    </> : <>
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Sign in" onPress={() => void signIn()} disabled={busy} />
      {siteUrl ? <Button title="Create account" secondary onPress={() => Linking.openURL(`${siteUrl}/auth/sign-up`)} /> : null}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  loading: { color: theme.lime, fontSize: 28, fontWeight: '900', margin: 28 },
  header: { height: 58, paddingHorizontal: 20, borderBottomWidth: 1, borderColor: theme.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: theme.text, fontSize: 19, fontWeight: '900', letterSpacing: -1 },
  headerRight: { color: theme.lime, fontSize: 10, fontWeight: '800', maxWidth: 130, textAlign: 'right' },
  body: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  tabs: { flexDirection: 'row', borderTopWidth: 1, borderColor: theme.line, backgroundColor: theme.bg, minHeight: 58 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  activeTab: { borderTopWidth: 2, borderColor: theme.lime },
  tabText: { color: theme.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.2 },
  card: { backgroundColor: theme.panel, marginBottom: 18, borderWidth: 1, borderColor: theme.line },
  shopImage: { width: '100%', height: 260, resizeMode: 'cover', backgroundColor: theme.line },
  detailImage: { width: '100%', height: 340, resizeMode: 'cover', backgroundColor: theme.panel, marginBottom: 24 },
  detailTitle: { color: theme.text, fontSize: 30, fontWeight: '900', lineHeight: 34 },
  cardBody: { padding: 16 },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 5 },
  mini: { color: theme.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  price: { color: theme.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  link: { color: theme.lime, fontSize: 11, fontWeight: '900', marginTop: 16, letterSpacing: 1 },
  muted: { color: theme.muted, fontSize: 13, lineHeight: 19 },
  productRow: { borderBottomWidth: 1, borderColor: theme.line, paddingVertical: 15, flexDirection: 'row', gap: 15 },
  thumb: { width: 86, height: 86, backgroundColor: theme.panel },
  photoPlaceholder: { height: 220, backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  preview: { width: '100%', height: 260, resizeMode: 'cover', marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  label: { color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { borderWidth: 1, borderColor: theme.line, paddingHorizontal: 12, paddingVertical: 10 },
  chipActive: { backgroundColor: theme.lime, borderColor: theme.lime },
  chipText: { color: theme.text, fontSize: 11, fontWeight: '800' },
  checkboxRow: { flexDirection: 'row', gap: 12, paddingVertical: 15, marginBottom: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.line },
  checkbox: { width: 23, height: 23, borderWidth: 1, borderColor: theme.lime, marginTop: 2 },
  balance: { padding: 25, backgroundColor: theme.panel, marginBottom: 30, borderWidth: 1, borderColor: theme.line },
  balanceNumber: { color: theme.lime, fontSize: 64, fontWeight: '900' },
  listRow: { paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.line },
});
