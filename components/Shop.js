'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ADDON_QTY_OPTIONS, BUNDLE_ADDONS, CATEGORIES, NAPKIN_MIN_QTY, NAPKIN_ORDER_DESIGN_FEE, NAPKIN_QTY_OPTIONS, PACKAGE_ORDER_DESIGN_FEE, PEOPLE_OPTIONS, SHOP_HUB, addonTotal, basePrice, designFee, emptyBundleAddons, findProduct, isBabyBundle, isMonogramTowel, isPerPersonPackage, isTieredNapkins, napkinUnitPrice, normalizeBundleAddons, productHref, productImages, requiresCustomization } from '@/lib/catalog';
import { lineProductId, loadCart, persistCart } from '@/lib/cart';
import { openCart } from '@/lib/cart-ui';
import { validateDesignItem } from '@/lib/design-options';
import DesignFields, { designDraftFor, emptyDesignDraft } from './DesignFields';
import FancySelect from './FancySelect';
import ProductGallery from './ProductGallery';
import TurnaroundNote from './TurnaroundNote';
import { useScrollLock } from '@/lib/scroll-lock';

function categoryFromPath(pathname) {
  const match = String(pathname || '').match(/^\/shop\/([^/?#]+)/);
  if (!match || match[1] === 'custom') return undefined;
  return match[1];
}

function productFromPath(pathname) {
  const match = String(pathname || '').match(/^\/shop\/[^/?#]+\/([^/?#]+)/);
  return match?.[1];
}

export default function Shop({ category, productKey, products, user, turnaround }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const [sort, setSort] = useState('featured');
  const [priceFilter, setPriceFilter] = useState('all');
  const [openedCategory, setOpenedCategory] = useState(undefined);
  const [openedProduct, setOpenedProduct] = useState(undefined);
  const [designDraft, setDesignDraft] = useState(emptyDesignDraft);
  const [designError, setDesignError] = useState('');
  const [addingProduct, setAddingProduct] = useState(null);
  const [peopleCount, setPeopleCount] = useState(1);
  const [napkinCount, setNapkinCount] = useState(NAPKIN_MIN_QTY);

  useEffect(() => {
    setOpenedCategory(undefined);
    setOpenedProduct(undefined);
    setDesignDraft(emptyDesignDraft);
    setDesignError('');
    setAddingProduct(null);
    setPeopleCount(1);
    setNapkinCount(NAPKIN_MIN_QTY);
  }, [pathname]);

  const categoryId = openedCategory !== undefined
    ? openedCategory
    : (categoryFromPath(pathname) || params?.category || category);
  const activeCategory = CATEGORIES.find((item) => item.id === categoryId);
  const activeProduct = openedProduct !== undefined
    ? openedProduct
    : findProduct(products, productFromPath(pathname) || params?.product || productKey);

  useEffect(() => {
    setDesignDraft(designDraftFor(activeProduct));
    setDesignError('');
    setPeopleCount(1);
    setNapkinCount(NAPKIN_MIN_QTY);
  }, [activeProduct?.id]);

  useScrollLock(Boolean(addingProduct));

  useEffect(() => {
    if (!addingProduct) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setAddingProduct(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addingProduct]);

  const scrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const openCategory = (id) => {
    setOpenedCategory(id);
    setOpenedProduct(null);
    scrollTop();
    router.push(id ? `/shop/${id}` : '/shop');
  };

  const openItem = (product) => {
    setOpenedProduct(product);
    scrollTop();
    router.push(productHref(product));
  };

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
    const items = loadCart();
    const mergeable = !extrasWithRequired.wantsDesign && !isPerPersonPackage(product) && !isTieredNapkins(product)
      ? items.find((item) => lineProductId(item) === product.id && !item.wantsDesign && !item.isCustom)
      : null;
    let next;
    if (mergeable) {
      next = items.map((item) => (item.id === mergeable.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      const quantity = isPerPersonPackage(product)
        ? peopleCount
        : (isTieredNapkins(product) ? napkinCount : 1);
      next = [...items, {
        ...line,
        id: `${product.id}::${crypto.randomUUID()}`,
        productId: product.id,
        quantity,
        people: isPerPersonPackage(product) ? quantity : undefined,
        bundleAddons: isBabyBundle(product) ? normalizeBundleAddons(extrasWithRequired) : undefined,
        personalization: product.personalization || '',
      }];
    }
    persistCart(next);
    openCart();
    setDesignDraft(designDraftFor(product));
    setAddingProduct(null);
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
      <div className="buy-block people-picker">
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
      <div className="buy-block addon-picker">
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
      <div className="buy-block people-picker">
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

  const visibleProducts = useMemo(() => products
    .filter((item) => item.category === categoryId)
    .filter((item) => priceFilter === 'all' || (priceFilter === 'under-30' ? basePrice(item) < 30 : basePrice(item) >= 30))
    .sort((a, b) => sort === 'price-low' ? basePrice(a) - basePrice(b) : sort === 'price-high' ? basePrice(b) - basePrice(a) : sort === 'name' ? a.name.localeCompare(b.name) : (a.sort_order || 0) - (b.sort_order || 0)), [products, categoryId, priceFilter, sort]);

  return (
    <main className="shop-page">
      {activeProduct ? (
        <section className="section">
          <div className="container">
            <Link
              className="back-link"
              href={activeCategory ? `/shop/${activeCategory.id}` : '/shop'}
              onClick={(event) => {
                event.preventDefault();
                openCategory(activeCategory?.id || null);
              }}
            >
              ← {activeCategory ? activeCategory.name : 'All collections'}
            </Link>
            <div className="item-page-layout">
              <ProductGallery images={productImages(activeProduct)} name={activeProduct.name} />
              <div className="item-page-copy">
                <p className="eyebrow">{activeCategory?.preorder ? 'Preorder' : 'Custom embroidery'}</p>
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
                <button className="btn btn--primary btn--lg" type="button" onClick={() => addToCart(activeProduct, designDraft)}>Add to bag</button>
              </div>
            </div>
          </div>
        </section>
      ) : !activeCategory ? (
        <>
          <section className="shop-hero shop-hero--center">
            <div className="container">
              <p className="eyebrow">The Love &amp; Co. shop</p>
              <h1>Personal pieces, <i>made for your people.</i></h1>
              <p>Choose a collection, make it yours, and we’ll carefully bring it to life.</p>
              <TurnaroundNote turnaround={turnaround} />
            </div>
          </section>
          <section className="section section--tight">
            <div className="container">
              <div className="product-grid">
                {SHOP_HUB.map((item) => (
                  <Link
                    className="product-card"
                    href={item.shopPath}
                    key={item.id}
                    onClick={(event) => {
                      event.preventDefault();
                      openCategory(item.id);
                    }}
                  >
                    <div className="product-card-media">
                      <img src={item.image} alt="" />
                      {item.preorder && <span className="card-badge">Preorder</span>}
                    </div>
                    <div className="product-card-body">
                      <h2>{item.name}</h2>
                      <p>{item.detail}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="shop-hero">
            <div className="container">
              <Link className="back-link" href="/shop" onClick={(event) => { event.preventDefault(); openCategory(null); }}>← All collections</Link>
              <p className="eyebrow">The Love &amp; Co. shop</p>
              <h1>{activeCategory.name}</h1>
              <p>{activeCategory.detail}</p>
              <TurnaroundNote turnaround={turnaround} />
            </div>
          </section>
          <section className="section section--tight">
            <div className="container">
              <div className="catalog-controls">
                <p className="catalog-count">{visibleProducts.length} {visibleProducts.length === 1 ? 'piece' : 'pieces'}</p>
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
              </div>
              {visibleProducts.length === 0 ? (
                <p className="empty-catalog">Nothing is listed in this collection yet. A custom order is always welcome.</p>
              ) : (
                <div className="product-grid">
                  {visibleProducts.map((product) => (
                    <article className="product-card" key={product.id}>
                      <ProductGallery
                        compact
                        images={productImages(product)}
                        name={product.name}
                        onActivate={() => openItem(product)}
                      />
                      <div className="product-card-body">
                        <Link href={productHref(product)} onClick={(event) => { event.preventDefault(); openItem(product); }}>
                          <h2>{product.name}</h2>
                          <p>{product.detail}</p>
                        </Link>
                        <div className="product-card-foot">
                          <strong>{isPerPersonPackage(product) ? `$${Number(product.item_price || product.price || 0).toFixed(2)} / person` : isTieredNapkins(product) ? 'From $8.00' : `$${basePrice(product).toFixed(2)}`}</strong>
                          <button className="btn btn--secondary btn--sm" onClick={() => startAdd(product)} type="button">Add <Plus aria-hidden="true" /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {addingProduct && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
          <button className="scrim" type="button" aria-label="Close" onClick={() => setAddingProduct(null)} />
          <section className="modal">
            <button className="drawer-close" type="button" onClick={() => setAddingProduct(null)} aria-label="Close"><X aria-hidden="true" /></button>
            <p className="eyebrow">Add to bag</p>
            <h2 className="modal-title" id="add-item-title">{addingProduct.name}</h2>
            {isPerPersonPackage(addingProduct)
              ? peoplePicker(addingProduct)
              : isTieredNapkins(addingProduct)
                ? napkinPicker(addingProduct)
                : isBabyBundle(addingProduct)
                  ? addonPicker(addingProduct)
                  : <p className="item-price">${basePrice(addingProduct).toFixed(2)}</p>}
            {designSection(addingProduct)}
            {designError && <p className="form-error" role="alert">{designError}</p>}
            <div className="form-actions">
              <button className="btn btn--primary btn--block" type="button" onClick={() => addToCart(addingProduct, designDraft)}>Add to bag</button>
            </div>
          </section>
        </div>
      )}

    </main>
  );
}
