import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Search, MapPin, ShoppingBag, Home, ClipboardList, UserRound, Plus, Minus, X, Clock3, Star,
  ArrowRight, ArrowLeft, Store as StoreIcon, Bike, CheckCircle2, ChevronDown,
  UtensilsCrossed, ShoppingBasket, Pill, Coffee, CupSoda, PawPrint, CakeSlice,
} from 'lucide-react';

type Category = { id: number; name: string; emoji: string };
type Store = { id: number; name: string; description: string; imageUrl: string; deliveryFee: number; deliveryMinutes: number; rating: number; categoryId: number; categoryName: string };
type Product = { id: number; name: string; description: string; price: number; imageUrl: string; stock: number; storeId: number; storeName: string };
type CartLine = { product: Product; quantity: number };
type Order = { id: number; total: number; status: string; createdAt: string; items: { productName: string; quantity: number }[] };
type Tab = 'home' | 'orders' | 'profile';
type StoreFilter = 'all' | 'free' | 'rating' | 'fast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollToTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });

const fallbackCategories: Category[] = [
  { id: 1, name: 'Restaurantes', emoji: '🍔' },
  { id: 2, name: 'Mercados', emoji: '🛒' },
  { id: 3, name: 'Farmácias', emoji: '💊' },
  { id: 4, name: 'Cafés', emoji: '☕' },
  { id: 5, name: 'Conveniência', emoji: '🧃' },
];

function categoryIcon(name: string): LucideIcon {
  const key = name.toLowerCase();
  if (/restaur|comida|lanche|pizza|hamburg|japon|sushi|asiát|marmita/.test(key)) return UtensilsCrossed;
  if (/merc|hortifruti|feira|açougue/.test(key)) return ShoppingBasket;
  if (/farm|saúde|drogaria/.test(key)) return Pill;
  if (/caf|padaria|doceria/.test(key)) return Coffee;
  if (/conveni|bebida|suco|mercado/.test(key)) return CupSoda;
  if (/pet/.test(key)) return PawPrint;
  if (/doce|sobremesa|bolo/.test(key)) return CakeSlice;
  return StoreIcon;
}

function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon size={22} strokeWidth={1.8} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!r.ok) {
    const body = await r.json().catch(() => ({ message: 'Não foi possível concluir a solicitação.' }));
    throw new Error(body.detail || body.message || 'Erro na API');
  }
  return r.json();
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [category, setCategory] = useState<number | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [tab, setTab] = useState<Tab>('home');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState('');
  const [apiOnline, setApiOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<{ key: number; name: string; count: number } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([request<Category[]>('/categories'), request<Store[]>('/stores')]);
      setCategories(c);
      setStores(s);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(null), 2400);
    return () => window.clearTimeout(timer);
  }, [added]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTab('home');
        setSelectedStore(null);
        window.setTimeout(() => searchRef.current?.focus(), 80);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!cartOpen && !checkoutOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false);
        setCheckoutOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [cartOpen, checkoutOpen]);

  const filteredStores = useMemo(() => {
    const list = stores.filter((s) => (category === null || s.categoryId === category) && (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase())));
    if (storeFilter === 'free') return list.filter((s) => s.deliveryFee === 0);
    if (storeFilter === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    if (storeFilter === 'fast') return [...list].sort((a, b) => a.deliveryMinutes - b.deliveryMinutes);
    return list;
  }, [stores, category, search, storeFilter]);

  const freeStores = useMemo(() => stores.filter((s) => s.deliveryFee === 0).length, [stores]);
  const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const fee = cart.length ? stores.find((s) => s.id === cart[0].product.storeId)?.deliveryFee || 0 : 0;
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const storeLabel = category ? categories.find((c) => c.id === category)?.name : null;

  function goHome() {
    setTab('home');
    setSelectedStore(null);
    scrollToTop();
  }

  function goTo(tabName: Tab) {
    setTab(tabName);
    setSelectedStore(null);
    scrollToTop();
  }

  function focusSearch() {
    setTab('home');
    setSelectedStore(null);
    scrollToTop();
    window.setTimeout(() => searchRef.current?.focus(), 80);
  }

  function scrollToStores() {
    document.getElementById('lojas')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  async function openStore(store: Store) {
    setSelectedStore(store);
    setProducts([]);
    setProductsLoading(true);
    scrollToTop();
    try {
      setProducts(await request<Product[]>(`/products?storeId=${store.id}`));
    } catch {
      setProducts([]);
      setNotice('Não foi possível carregar os itens desta loja.');
    } finally {
      setProductsLoading(false);
    }
  }

  function add(product: Product) {
    if (cart.length && cart[0].product.storeId !== product.storeId) {
      setNotice('Sua sacola só pode ter itens de uma loja por vez.');
      return;
    }
    const existing = cart.find((x) => x.product.id === product.id);
    const next = existing
      ? cart.map((x) => (x.product.id === product.id ? { ...x, quantity: x.quantity + 1 } : x))
      : [...cart, { product, quantity: 1 }];
    setCart(next);
    setAdded({ key: Date.now(), name: product.name, count: next.reduce((sum, line) => sum + line.quantity, 0) });
  }

  function changeQty(id: number, delta: number) {
    setCart((prev) => prev.map((x) => (x.product.id === id ? { ...x, quantity: x.quantity + delta } : x)).filter((x) => x.quantity > 0));
  }

  async function placeOrder() {
    if (!name.trim() || !email.trim() || !address.trim()) {
      setNotice('Preencha nome, e-mail e endereço.');
      return;
    }
    try {
      const order = await request<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: name,
          customerEmail: email,
          deliveryAddress: address,
          items: cart.map((x) => ({ productId: x.product.id, quantity: x.quantity })),
        }),
      });
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setNotice(`Pedido #${order.id} confirmado. Total: ${money(order.total)}.`);
      setTab('orders');
      await loadOrders();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Erro ao enviar pedido.');
    }
  }

  async function loadOrders() {
    if (!email.trim()) return;
    try {
      setOrders(await request<Order[]>(`/orders?email=${encodeURIComponent(email)}`));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Não foi possível consultar pedidos.');
    }
  }

  function statusTone(status: string) {
    if (/entregue|conclu|delivered/i.test(status)) return 'done';
    if (/cancel/i.test(status)) return 'cancel';
    return '';
  }

  function statusLabel(status: string) {
    const key = status.trim().toUpperCase();
    const labels: Record<string, string> = {
      RECEIVED: 'Recebido',
      PENDING: 'Pendente',
      CONFIRMED: 'Confirmado',
      PREPARING: 'Em preparo',
      READY: 'Pronto',
      DELIVERING: 'Em rota',
      OUT_FOR_DELIVERY: 'Em rota',
      DELIVERED: 'Entregue',
      COMPLETED: 'Concluído',
      CANCELLED: 'Cancelado',
      CANCELED: 'Cancelado',
    };
    return labels[key] || status;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={goHome} aria-label="EntregaJá — início">
          <span className="brand-mark">e</span>
          <span className="brand-word">entrega<span>já</span></span>
        </button>

        <nav className="topnav" aria-label="Navegação principal">
          <button className={tab === 'home' ? 'active' : ''} onClick={goHome}>Início</button>
          <button className={tab === 'orders' ? 'active' : ''} onClick={() => { goTo('orders'); void loadOrders(); }}>Pedidos</button>
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => goTo('profile')}>Perfil</button>
        </nav>

        <div className="topbar-actions">
          <button className="location" onClick={() => goTo('profile')} aria-label="Editar endereço de entrega">
            <MapPin size={18} strokeWidth={2} />
            <span>
              <small>Entregar em</small>
              <strong>{address || 'Definir endereço'}</strong>
            </span>
            <ChevronDown size={15} />
          </button>
          <button className="cart-top" onClick={() => setCartOpen(true)} aria-label={`Abrir sacola com ${cartCount} item(ns)`}>
            <ShoppingBag size={20} strokeWidth={1.9} />
            {cartCount > 0 && <b key={cartCount}>{cartCount}</b>}
          </button>
        </div>
      </header>
      <main>
        {tab === 'home' && (
          <>
            {!selectedStore ? (
              <>
                <div className="home-search">
                  <div className="searchbar">
                    <Search size={20} strokeWidth={1.9} />
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar loja"
                      aria-label="Buscar loja"
                    />
                    {search && (
                      <button className="search-clear" onClick={() => setSearch('')} aria-label="Limpar busca">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="categories" role="group" aria-label="Categorias">
                  {categories.map((c) => {
                    const Icon = categoryIcon(c.name);
                    return (
                      <button
                        key={c.id}
                        className={`category ${category === c.id ? 'active' : ''}`}
                        onClick={() => setCategory(category === c.id ? null : c.id)}
                        aria-pressed={category === c.id}
                      >
                        <span className="category-icon"><Icon size={25} strokeWidth={1.7} /></span>
                        <b>{c.name}</b>
                      </button>
                    );
                  })}
                </div>

                {apiOnline && !loading && freeStores > 0 && (
                  <section className="promo-banner">
                    <span className="promo-badge"><Bike size={22} /></span>
                    <div className="promo-copy">
                      <strong>Entrega grátis</strong>
                      <span>Em {freeStores} {freeStores === 1 ? 'loja' : 'lojas'}</span>
                    </div>
                    <button
                      className="promo-btn"
                      onClick={() => { setCategory(null); setSearch(''); setStoreFilter('free'); scrollToStores(); }}
                    >
                      Ver lojas <ArrowRight size={16} />
                    </button>
                  </section>
                )}

                <section className="stores-section" id="lojas">
                  <div className="section-heading">
                    <h2>{storeLabel || 'Lojas'}</h2>
                    {apiOnline && !loading && (
                      <span className="result-count">{filteredStores.length} {filteredStores.length === 1 ? 'loja' : 'lojas'}</span>
                    )}
                  </div>

                  {apiOnline && !loading && (
                    <div className="filter-chips" role="group" aria-label="Filtros de lojas">
                      <button className={storeFilter === 'all' ? 'active' : ''} aria-pressed={storeFilter === 'all'} onClick={() => setStoreFilter('all')}>Todos</button>
                      <button className={storeFilter === 'free' ? 'active' : ''} aria-pressed={storeFilter === 'free'} onClick={() => setStoreFilter('free')}>Entrega grátis</button>
                      <button className={storeFilter === 'rating' ? 'active' : ''} aria-pressed={storeFilter === 'rating'} onClick={() => setStoreFilter('rating')}>Melhor avaliadas</button>
                      <button className={storeFilter === 'fast' ? 'active' : ''} aria-pressed={storeFilter === 'fast'} onClick={() => setStoreFilter('fast')}>Mais rápidas</button>
                    </div>
                  )}

                  {loading ? (
                    <>
                      <p className="sr-only" role="status">Carregando lojas…</p>
                      <div className="store-grid" aria-hidden="true">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div className="store-card skeleton-card" key={i}>
                            <div className="sk-photo" />
                            <div className="store-info">
                              <span className="sk-line short" />
                              <span className="sk-line" />
                              <span className="sk-line medium" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : !apiOnline ? (
                    <EmptyState icon={StoreIcon} title="Não foi possível carregar as lojas" description="Verifique se a API está ativa e tente novamente." />
                  ) : filteredStores.length === 0 ? (
                    <EmptyState icon={Search} title="Nenhuma loja encontrada" description="Tente outra busca ou remova os filtros." />
                  ) : (
                    <div className="store-grid">
                      {filteredStores.map((s) => (
                        <button className="store-card" key={s.id} onClick={() => openStore(s)}>
                          <div className="store-photo">
                            <img src={s.imageUrl} alt={s.name} loading="lazy" />
                            {s.deliveryFee === 0 && <span className="free-badge">Entrega grátis</span>}
                          </div>
                          <div className="store-info">
                            <span className="store-cat">{s.categoryName}</span>
                            <h3>{s.name}</h3>
                            <p>{s.description}</p>
                            <div className="store-meta">
                              <span className="rating"><Star size={13} fill="currentColor" />{s.rating.toFixed(1)}</span>
                              <i className="dot" />
                              <span className="time"><Clock3 size={13} />{s.deliveryMinutes}–{s.deliveryMinutes + 10} min</span>
                              <i className="dot" />
                              <span className={s.deliveryFee === 0 ? 'free' : ''}>{s.deliveryFee === 0 ? 'Grátis' : money(s.deliveryFee)}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <>
                <div className="catalog">
                  <button className="back-btn" onClick={goHome}>
                    <ArrowLeft size={18} /> Voltar
                  </button>

                  <div className="store-cover">
                    <img src={selectedStore.imageUrl} alt={selectedStore.name} />
                    {selectedStore.deliveryFee === 0 && <span className="free-badge">Entrega grátis</span>}
                  </div>

                  <section className="store-summary">
                    <span className="store-cat">{selectedStore.categoryName}</span>
                    <h1>{selectedStore.name}</h1>
                    <p>{selectedStore.description}</p>
                    <div className="store-meta">
                      <span className="rating"><Star size={14} fill="currentColor" />{selectedStore.rating.toFixed(1)}</span>
                      <i className="dot" />
                      <span className="time"><Clock3 size={14} />{selectedStore.deliveryMinutes}–{selectedStore.deliveryMinutes + 10} min</span>
                      <i className="dot" />
                      <span className={selectedStore.deliveryFee === 0 ? 'free' : ''}>
                        {selectedStore.deliveryFee === 0 ? 'Entrega grátis' : `Entrega ${money(selectedStore.deliveryFee)}`}
                      </span>
                    </div>
                  </section>

                  <section className="catalog-section">
                    <div className="section-heading">
                      <h2>Mais pedidos</h2>
                      {!productsLoading && products.length > 0 && (
                        <span className="result-count">{products.length} {products.length === 1 ? 'item' : 'itens'}</span>
                      )}
                    </div>

                    {productsLoading ? (
                      <>
                        <p className="sr-only" role="status">Carregando itens…</p>
                        <div className="product-grid" aria-hidden="true">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div className="product-card skeleton-card" key={i}>
                              <div className="sk-photo" />
                              <div className="product-info">
                                <span className="sk-line" />
                                <span className="sk-line medium" />
                                <span className="sk-line short" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : products.length === 0 ? (
                      <EmptyState icon={StoreIcon} title="Nenhum item disponível" description="Esta loja ainda não publicou itens." />
                    ) : (
                      <div className="product-grid">
                        {products.map((p) => {
                          const inCart = cart.find((line) => line.product.id === p.id);
                          const out = p.stock <= 0;
                          return (
                            <article className={`product-card ${out ? 'sold-out' : ''}`} key={p.id}>
                              <div className="product-photo">
                                <img src={p.imageUrl} alt={p.name} loading="lazy" />
                                {out && <span className="sold-out-badge">Esgotado</span>}
                              </div>
                              <div className="product-info">
                                <h3>{p.name}</h3>
                                <p>{p.description}</p>
                                <div className="product-foot">
                                  <strong>{money(p.price)}</strong>
                                  {!out && (
                                    inCart ? (
                                      <div className="qty-stepper" aria-label={`Quantidade de ${p.name}`}>
                                        <button onClick={() => changeQty(p.id, -1)} aria-label={`Remover um ${p.name}`}>
                                          <Minus size={15} />
                                        </button>
                                        <span>{inCart.quantity}</span>
                                        <button onClick={() => add(p)} aria-label={`Adicionar um ${p.name}`}>
                                          <Plus size={15} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button className="add-btn" onClick={() => add(p)} aria-label={`Adicionar ${p.name} à sacola`}>
                                        <Plus size={18} />
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'orders' && (
          <>
            <div className="panel">
              <div className="panel-head">
                <h1>Pedidos</h1>
                <p>Consulte pelo e-mail usado na compra.</p>
              </div>

              <form
                className="panel-form"
                onSubmit={(e) => { e.preventDefault(); void loadOrders(); }}
              >
                <label>
                  E-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    autoComplete="email"
                  />
                </label>
                <button type="submit" className="primary-btn">Buscar pedidos</button>
              </form>

              {orders.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum pedido encontrado"
                  description={email ? 'Não encontramos pedidos para este e-mail.' : 'Informe seu e-mail para ver o histórico.'}
                />
              ) : (
                <div className="order-list">
                  {orders.map((o) => (
                    <article className="order-card" key={o.id}>
                      <div className="order-top">
                        <strong>Pedido #{o.id}</strong>
                        <span className={`status-pill ${statusTone(o.status)}`}>{statusLabel(o.status)}</span>
                      </div>
                      <ul>
                        {o.items.map((item, i) => (
                          <li key={i}>
                            <span>{item.quantity}× {item.productName}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="order-foot">
                        <span>{new Date(o.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <strong>{money(o.total)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'profile' && (
          <>
            <div className="panel">
              <div className="panel-head">
                <h1>Perfil</h1>
                <p>Dados usados na entrega e no histórico de pedidos.</p>
              </div>

              <form
                className="panel-form"
                onSubmit={(e) => { e.preventDefault(); setNotice('Dados atualizados.'); }}
              >
                <label>
                  Nome
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                  />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@email.com"
                    autoComplete="email"
                  />
                </label>
                <label>
                  Endereço de entrega
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro"
                    autoComplete="street-address"
                  />
                </label>
                <button type="submit" className="primary-btn">Salvar dados</button>
              </form>
            </div>
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Navegação">
        <button className={tab === 'home' ? 'active' : ''} onClick={goHome}>
          <Home size={21} strokeWidth={1.9} />
          <span>Início</span>
        </button>
        <button onClick={focusSearch}>
          <Search size={21} strokeWidth={1.9} />
          <span>Buscar</span>
        </button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => { goTo('orders'); void loadOrders(); }}>
          <ClipboardList size={21} strokeWidth={1.9} />
          <span>Pedidos</span>
        </button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => goTo('profile')}>
          <UserRound size={21} strokeWidth={1.9} />
          <span>Perfil</span>
        </button>
      </nav>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-mark">e</span>
          <span className="brand-word">entrega<span>já</span></span>
        </div>
        <span className={`api-status ${apiOnline ? 'on' : 'off'}`}>
          <i /> {apiOnline ? 'API conectada' : 'API indisponível'}
        </span>
      </footer>

      {(cartOpen || checkoutOpen) && (
        <div
          className="overlay"
          onClick={() => { setCartOpen(false); setCheckoutOpen(false); }}
          aria-hidden="true"
        />
      )}

      <aside
        className={`cart-drawer ${cartOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Sacola"
        aria-hidden={!cartOpen}
      >
        <div className="drawer-head">
          <h2>Sacola</h2>
          <button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Fechar sacola">
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <EmptyState icon={ShoppingBag} title="Sua sacola está vazia" description="Escolha uma loja e adicione itens." />
        ) : (
          <>
            <div className="cart-store">{cart[0].product.storeName}</div>
            <ul className="cart-lines">
              {cart.map((line) => (
                <li key={line.product.id}>
                  <img src={line.product.imageUrl} alt="" />
                  <div className="cart-line-info">
                    <strong>{line.product.name}</strong>
                    <span>{money(line.product.price)}</span>
                  </div>
                  <div className="qty-stepper">
                    <button onClick={() => changeQty(line.product.id, -1)} aria-label={`Remover um ${line.product.name}`}>
                      <Minus size={15} />
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => changeQty(line.product.id, 1)} aria-label={`Adicionar um ${line.product.name}`}>
                      <Plus size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="cart-summary">
              <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>Entrega</dt><dd>{fee === 0 ? 'Grátis' : money(fee)}</dd></div>
              <div className="total"><dt>Total</dt><dd>{money(subtotal + fee)}</dd></div>
            </dl>

            <button className="primary-btn block" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
              Continuar <ArrowRight size={18} />
            </button>
          </>
        )}
      </aside>

      {checkoutOpen && (
        <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Finalizar pedido">
          <div className="modal">
            <div className="drawer-head">
              <h2>Finalizar pedido</h2>
              <button className="icon-btn" onClick={() => setCheckoutOpen(false)} aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <form className="panel-form" onSubmit={(e) => { e.preventDefault(); void placeOrder(); }}>
              <label>
                Nome
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" autoComplete="name" />
              </label>
              <label>
                E-mail
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" autoComplete="email" />
              </label>
              <label>
                Endereço de entrega
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" autoComplete="street-address" />
              </label>

              <div className="checkout-total">
                <span>{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
                <strong>{money(subtotal + fee)}</strong>
              </div>

              <button type="submit" className="primary-btn block">Confirmar pedido</button>
            </form>
          </div>
        </div>
      )}

      {added && !cartOpen && !checkoutOpen && (
        <button className="add-pop" key={added.key} onClick={() => { setAdded(null); setCartOpen(true); }}>
          <CheckCircle2 size={18} />
          <span>Item adicionado</span>
          <b>Ver sacola ({added.count})</b>
        </button>
      )}

      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={15} /></button>
        </div>
      )}
    </div>
  );
}
