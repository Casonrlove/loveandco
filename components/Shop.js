'use client';

import StoreImage from './StoreImage';

import { useModalFocus } from '@/lib/use-modal-focus';

import { useMemo, useState } from 'react';
import { Dash, Plus, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ADDON_QTY_OPTIONS, BUNDLE_ADDONS, CART_EVENT, CART_KEY, CATEGORIES, NAPKIN_MIN_QTY, NAPKIN_ORDER_DESIGN_FEE, NAPKIN_QTY_OPTIONS, PACKAGE_ORDER_DESIGN_FEE, PEOPLE_OPTIONS, SHOP_HUB, addonTotal, basePrice, cartTotal, designFee, emptyBundleAddons, findProduct, isBabyBundle, isMonogramTowel, isPerPersonPackage, isTieredNapkins, napkinUnitPrice, normalizeBundleAddons, orderDesignFee, productHref, productImages, requiresCustomization, summarizeBundleAddons } from '@/lib/catalog';
import { lineProductId } from '@/lib/cart';
import { useCart } from '@/lib/use-cart';
import { summarizeDesign, validateDesignItem } from '@/lib/design-options';
import DesignFields, { designDraftFor, emptyDesignDraft } from './DesignFields';
import FancySelect from './FancySelect';
import ProductGallery from './ProductGallery';
import TurnaroundNote from './TurnaroundNote';

export default function Shop(props) {
  const pathname = usePathname();
  return <ShopContent key={pathname} {...props} />;
}

function ShopContent({ category, productKey, products, turnaround }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useCart();
  const [bagRequested, setBagRequested] = useState(false);
  const isBagOpen = bagRequested || searchParams.get('bag') === 'open';
  const setIsBagOpen = (open) => {
    setBagRequested(open);
    if (!open && searchParams.has('bag')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('bag');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  };
  const [sort, setSort] = useState('featured');
  const [priceFilter, setPriceFilter] = useState('all');
  const [designDraft, setDesignDraft] = useState(() => designDraftFor(findProduct(products, productKey)));
  const [designError, setDesignError] = useState('');
  const [addingProduct, setAddingProduct] = useState(null);
  const itemDialog = useModalFocus(Boolean(addingProduct), () => setAddingProduct(null));
  const bagDialog = useModalFocus(isBagOpen, () => setIsBagOpen(false));
  const [peopleCount, setPeopleCount] = useState(1);
  const [napkinCount, setNapkinCount] = useState(NAPKIN_MIN_QTY);

  const categoryId = category;
  const activeCategory = CATEGORIES.find((item) => item.id === categoryId);
  const activeProduct = findProduct(products, productKey);

  const scrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openCategory = (id) => {
    scrollTop();
    router.push(id ? `/shop/${id}` : '/shop');
  };

  const openItem = (product) => {
    scrollTop();
    router.push(productHref(product));
  };
  const bag = cart;
  const itemCount = bag.reduce((total, item) => total + item.quantity, 0);
  const hasCustomItem = bag.some((item) => item.isCustom);
  const total = useMemo(() => cartTotal(bag), [bag]);
  const packageFee = orderDesignFee(bag);


  const addToCart = (product, extras = emptyDesignDraft) => {
    const extrasWithRequired = requiresCustomization(product)
      ? { ...extras, wantsDesign: true }
      : extras;
    const line = { ...product, ...extrasWithRequired };
    const error = validateDesignItem(line);
    if (error) {
      setDesignError(error);
      return false;
    }
    setDesignError('');
    setCart((items) => {
      if (!extrasWithRequired.wantsDesign && !isPerPersonPackage(product) && !isTieredNapkins(product)) {
        const existing = items.find((item) => lineProductId(item) === product.id && !item.wantsDesign && !item.isCustom);
        if (existing) {
          return items.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
      }
      const quantity = isPerPersonPackage(product)
        ? peopleCount
        : (isTieredNapkins(product) ? napkinCount : 1);
      return [...items, {
        ...line,
        id: `${product.id}::${crypto.randomUUID()}`,
        productId: product.id,
        quantity,
        people: isPerPersonPackage(product) ? quantity : undefined,
        bundleAddons: isBabyBundle(product) ? normalizeBundleAddons(extrasWithRequired) : undefined,
        personalization: product.personalization || '',
      }];
    });
    setDesignDraft(designDraftFor(product));
    setAddingProduct(null);
    setIsBagOpen(true);
    if (!searchParams.get('bag')) {
      const path = product.category && (product.slug || product.id)
        ? productHref(product)
        : (pathname || '/shop');
      router.replace(`${path}?bag=open`, { scroll: false });
    }
    return true;
  };

  const startAdd = (product) => {
    setDesignDraft(designDraftFor(product));
    setDesignError('');
    setPeopleCount(1);
    setNapkinCount(NAPKIN_MIN_QTY);
    setAddingProduct(product);
  };

  const peoplePicker = (product) => {
    if (!isPerPersonPackage(product)) return null;
    const each = basePrice(product);
    const total = each * peopleCount;
    return (
      <div className="people-picker">
        <p className="helper">Each person gets one trucker hat and one tote bag.</p>
        <label>Number of people
          <FancySelect
            value={String(peopleCount)}
            onChange={(value) => setPeopleCount(Number(value) || 1)}
            options={PEOPLE_OPTIONS}
          />
        </label>
        <p className="item-price">${(total + PACKAGE_ORDER_DESIGN_FEE).toFixed(2)}</p>
        <p className="helper">${each.toFixed(2)} per person · ${PACKAGE_ORDER_DESIGN_FEE.toFixed(2)} design fee once per order</p>
      </div>
    );
  };

  const setAddonQty = (id, value) => {
    setDesignDraft((current) => ({
      ...current,
      bundleAddons: {
        ...emptyBundleAddons(),
        ...normalizeBundleAddons(current),
        [id]: Number(value) || 0,
      },
    }));
  };

  const addonPicker = (product) => {
    if (!isBabyBundle(product)) return null;
    const extras = addonTotal({ ...product, bundleAddons: normalizeBundleAddons(designDraft) });
    const bundle = basePrice(product);
    return (
      <div className="addon-picker">
        <p className="helper">Add extra embroidered pieces to this bundle. Outfits $22 each, burp cloths $12, bibs $12, and paci clips $14.</p>
        <div className="addon-picker-grid">
          {BUNDLE_ADDONS.map((addon) => (
            <label key={addon.id}>{addon.label}
              <FancySelect
                value={String(normalizeBundleAddons(designDraft)[addon.id] || 0)}
                onChange={(value) => setAddonQty(addon.id, value)}
                options={ADDON_QTY_OPTIONS}
              />
              <small className="design-note">${addon.price.toFixed(2)} each</small>
            </label>
          ))}
        </div>
        <p className="item-price">${(bundle + extras).toFixed(2)}</p>
        {extras > 0
          ? <p className="helper">Bundle ${bundle.toFixed(2)} · extras ${extras.toFixed(2)}</p>
          : <p className="helper">Bundle ${bundle.toFixed(2)} · extras optional</p>}
      </div>
    );
  };

  const napkinPicker = (product) => {
    if (!isTieredNapkins(product)) return null;
    const each = napkinUnitPrice(napkinCount);
    const total = each * napkinCount;
    return (
      <div className="people-picker">
        <p className="helper">Priced per napkin. 10 minimum. $12 each for 10–19, $10 each for 20–39, $9 each for 40–59, and $8 each for 60 and up.</p>
        <label>Quantity
          <FancySelect
            value={String(napkinCount)}
            onChange={(value) => setNapkinCount(Number(value) || NAPKIN_MIN_QTY)}
            options={NAPKIN_QTY_OPTIONS}
          />
        </label>
        <p className="item-price">${(total + NAPKIN_ORDER_DESIGN_FEE).toFixed(2)}</p>
        <p className="helper">${each.toFixed(2)} each · ${NAPKIN_ORDER_DESIGN_FEE.toFixed(2)} design fee once per order</p>
      </div>
    );
  };

  const designSection = (product) => {
    const required = requiresCustomization(product);
    const fee = designFee(product);
    if (required) {
      return (
        <>
          <p className="helper">
            {isPerPersonPackage(product)
              ? 'Design details are required. A $20 design fee is added once per order.'
              : isTieredNapkins(product)
                ? 'Design details are required. A $30 design fee is added once per order.'
                : isMonogramTowel(product)
                  ? 'Choose 1 letter and 1 thread color.'
                  : 'Customization is included. Please choose your theme and design details. Extra outfits, burp cloths, bibs, and paci clips can be added below.'}
          </p>
          <DesignFields
            item={designDraft}
            onChange={setDesignDraft}
            showTheme={isBabyBundle(product)}
            napkinFields={isTieredNapkins(product)}
            towelFields={isMonogramTowel(product)}
          />
        </>
      );
    }
    if (fee <= 0) return null;
    return (
      <>
        <label className="design-toggle">
          <input
            type="checkbox"
            checked={Boolean(designDraft.wantsDesign)}
            onChange={(event) => setDesignDraft({ ...designDraft, wantsDesign: event.target.checked })}
          />
          <span>Add a custom design · ${fee.toFixed(2)}</span>
        </label>
        {designDraft.wantsDesign && (
          <DesignFields item={designDraft} onChange={setDesignDraft} />
        )}
      </>
    );
  };

  const updateItem = (id, patch) => setCart((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const removeItem = (id) => setCart((items) => items.filter((item) => item.id !== id));

  const visibleProducts = useMemo(() => products
    .filter((item) => item.category === categoryId)
    .filter((item) => priceFilter === 'all' || (priceFilter === 'under-30' ? basePrice(item) < 30 : basePrice(item) >= 30))
    .sort((a, b) => sort === 'price-low' ? basePrice(a) - basePrice(b) : sort === 'price-high' ? basePrice(b) - basePrice(a) : sort === 'name' ? a.name.localeCompare(b.name) : (a.sort_order || 0) - (b.sort_order || 0)), [products, categoryId, priceFilter, sort]);

  return (
    <main className={`shop-page${activeProduct ? ' is-item' : activeCategory ? ' is-collection' : ' is-hub'}`}>
      {activeProduct ? (
        <section className="item-page">
          <Link
            href={activeCategory ? `/shop/${activeCategory.id}` : '/shop'}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              openCategory(activeCategory?.id || null);
            }}
          >
            ← {activeCategory ? activeCategory.name : 'All collections'}
          </Link>
          <div className="item-page-layout">
            <ProductGallery images={productImages(activeProduct)} name={activeProduct.name} />
            <div className="item-page-copy">
              <p className="eyebrow">{activeCategory?.preorder ? 'PREORDER' : 'CUSTOM EMBROIDERY'}</p>
              <h1>{activeProduct.name}</h1>
              <p>{activeProduct.detail}</p>
              {isPerPersonPackage(activeProduct)
                ? peoplePicker(activeProduct)
                : isTieredNapkins(activeProduct)
                  ? napkinPicker(activeProduct)
                  : isBabyBundle(activeProduct)
                    ? addonPicker(activeProduct)
                    : <p className="item-price">${basePrice(activeProduct).toFixed(2)}</p>}
              {designSection(activeProduct)}
              {designError && <p className="form-error" role="alert">{designError}</p>}
              <TurnaroundNote turnaround={turnaround} />
              <button className="studio-primary" type="button" onClick={() => addToCart(activeProduct, designDraft)}>Add to bag</button>
            </div>
          </div>
        </section>
      ) : !activeCategory ? (
        <>
          <section className="shop-intro">
            <p className="eyebrow">THE LOVE & CO. SHOP</p>
            <h1>Personal pieces, <i>made for your people.</i></h1>
            <p>Choose a collection, make it yours, and we’ll carefully bring it to life.</p>
            <TurnaroundNote turnaround={turnaround} />
          </section>
          <section className="shop-products shop-hub">
            {SHOP_HUB.map((item) => (
                <Link
                  className="product-card"
                  href={item.shopPath}
                  key={item.id}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    openCategory(item.id);
                  }}
                >
                  <StoreImage src={item.image} alt={item.name} />
                  <div>
                    {item.preorder && <p className="eyebrow">PREORDER</p>}
                    <h2>{item.name}</h2>
                    <p>{item.detail}</p>
                  </div>
                </Link>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className="catalog-hero">
            <Link href="/shop" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openCategory(null); }}>← All collections</Link>
            <p className="eyebrow">THE LOVE & CO. SHOP</p>
            <h1>{activeCategory.name}</h1>
            <p>{activeCategory.detail}</p>
            <TurnaroundNote turnaround={turnaround} />
          </section>
          <section className="catalog-controls">
            <p>{visibleProducts.length} {visibleProducts.length === 1 ? 'piece' : 'pieces'}</p>
            <label>Filter
              <FancySelect
                compact
                value={priceFilter}
                onChange={setPriceFilter}
                options={[
                  { value: 'all', label: 'All prices' },
                  { value: 'under-30', label: 'Under $30' },
                  { value: '30-plus', label: '$30 and up' },
                ]}
              />
            </label>
            <label>Sort
              <FancySelect
                compact
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'featured', label: 'Featured' },
                  { value: 'price-low', label: 'Price: low to high' },
                  { value: 'price-high', label: 'Price: high to low' },
                  { value: 'name', label: 'Name: A–Z' },
                ]}
              />
            </label>
          </section>
          <section className="shop-products catalog-products">
            {visibleProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <ProductGallery
                  compact
                  images={productImages(product)}
                  name={product.name}
                  onActivate={() => openItem(product)}
                />
                <Link href={productHref(product)} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openItem(product); }}>
                  <div>
                    <p className="eyebrow">CUSTOM EMBROIDERY</p>
                    <h2>{product.name}</h2>
                    <p>{product.detail}</p>
                  </div>
                </Link>
                <div className="product-bottom">
                  <strong>{isPerPersonPackage(product) ? `$${Number(product.item_price || product.price || 0).toFixed(2)} / person` : isTieredNapkins(product) ? 'From $8.00 each' : `$${basePrice(product).toFixed(2)}`}</strong>
                  <button onClick={() => startAdd(product)} type="button">Add to bag <Plus /></button>
                </div>
              </article>
            ))}
          </section>
          {visibleProducts.length === 0 && <p className="empty-catalog">Nothing is listed in this collection yet. A custom order is always welcome.</p>}
        </>
      )}

      {addingProduct && (
        <div ref={itemDialog} tabIndex={-1} className="checkout-overlay item-overlay" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
          <section className="checkout-card item-card add-item-card">
            <button className="drawer-close" type="button" onClick={() => setAddingProduct(null)} aria-label="Close"><X /></button>
            <p className="eyebrow">ADD TO BAG</p>
            <h2 id="add-item-title">{addingProduct.name}</h2>
            {isPerPersonPackage(addingProduct)
              ? peoplePicker(addingProduct)
              : isTieredNapkins(addingProduct)
                ? napkinPicker(addingProduct)
                : isBabyBundle(addingProduct)
                  ? addonPicker(addingProduct)
                  : <p>${basePrice(addingProduct).toFixed(2)}</p>}
            {designSection(addingProduct)}
            {designError && <p className="form-error" role="alert">{designError}</p>}
            <button className="studio-primary" type="button" onClick={() => addToCart(addingProduct, designDraft)}>Add to bag</button>
          </section>
        </div>
      )}

      {isBagOpen && (
        <aside ref={bagDialog} tabIndex={-1} role="dialog" aria-modal="true" className="cart-drawer" aria-label="Shopping bag">
          <button className="drawer-close" type="button" onClick={() => setIsBagOpen(false)} aria-label="Close bag"><X /></button>
          <p className="eyebrow">YOUR BAG</p>
          <h2>Good things are coming.</h2>
          {bag.length === 0 ? <p>Your bag is waiting for something special.</p> : (
            <>
              <div className="cart-items">
                {bag.map((item) => (
                  <article className="cart-line" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.isCustom ? 'Price to be confirmed after review' : isPerPersonPackage(item) ? `$${basePrice(item).toFixed(2)} per person · hat + tote` : isTieredNapkins(item) ? `$${basePrice(item).toFixed(2)} each` : `$${basePrice(item).toFixed(2)} each`}</span>
                      {!item.isCustom && item.wantsDesign && designFee(item) > 0 && (
                        <span className="cart-design-fee">Custom design +${designFee(item).toFixed(2)}</span>
                      )}
                      {summarizeBundleAddons(item) && (
                        <span className="cart-design-fee">{summarizeBundleAddons(item)}</span>
                      )}
                      {item.wantsDesign && summarizeDesign(item) && (
                        <span className="cart-design-fee">{summarizeDesign(item)}</span>
                      )}
                    </div>
                    <div className="cart-controls">
                      <div>
                        <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => item.quantity === 1 ? removeItem(item.id) : updateItem(item.id, { quantity: item.quantity - 1 })}><Dash /></button>
                        <span>{item.quantity}</span>
                        <button type="button" aria-label={`Add one ${item.name}`} onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}><Plus /></button>
                      </div>
                      <button type="button" className="remove-link" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                  </article>
                ))}
              </div>
              {packageFee > 0 && (
                <div className="cart-total">
                  <span>One-time design fee</span>
                  <strong>${packageFee.toFixed(2)}</strong>
                </div>
              )}
              <div className="cart-total">
                <span>{hasCustomItem ? 'Priced items subtotal' : 'Estimated total'}</span>
                <strong>${total.toFixed(2)}</strong>
              </div>
              {hasCustomItem && <small>Custom items are quoted after review and are not included in this subtotal.</small>}
              <TurnaroundNote turnaround={turnaround} compact />
              <Link className="studio-primary" href="/checkout" onClick={() => setIsBagOpen(false)}>Continue to checkout</Link>
            </>
          )}
        </aside>
      )}
    </main>
  );
}
