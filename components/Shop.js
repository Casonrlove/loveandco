'use client';

import StoreImage from './StoreImage';

import { useModalFocus } from '@/lib/use-modal-focus';

import { useMemo, useState } from 'react';
import { Plus, X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADDON_QTY_OPTIONS, BUNDLE_ADDONS, CATEGORIES, FAVORITE_SLUGS, NAPKIN_MIN_QTY, NAPKIN_ORDER_DESIGN_FEE, NAPKIN_QTY_OPTIONS, PACKAGE_ORDER_DESIGN_FEE, PEOPLE_OPTIONS, SHOP_HUB, addonTotal, basePrice, designFee, emptyBundleAddons, findProduct, isBabyBundle, isMonogramTowel, isPerPersonPackage, isTieredNapkins, napkinUnitPrice, normalizeBundleAddons, priceLabel, productHref, productImages, requiresCustomization } from '@/lib/catalog';
import { lineProductId, openBag } from '@/lib/cart';
import { useCart } from '@/lib/use-cart';
import { validateDesignItem } from '@/lib/design-options';
import DesignFields, { designDraftFor, emptyDesignDraft } from './DesignFields';
import FancySelect from './FancySelect';
import FavoritesCarousel from './FavoritesCarousel';
import ProductGallery from './ProductGallery';
import TurnaroundNote from './TurnaroundNote';

export default function Shop(props) {
  const pathname = usePathname();
  return <ShopContent key={pathname} {...props} />;
}

function ShopContent({ category, productKey, products }) {
  const router = useRouter();
  const [, setCart] = useCart();
  const [designDraft, setDesignDraft] = useState(() => designDraftFor(findProduct(products, productKey)));
  const [designError, setDesignError] = useState('');
  const [addingProduct, setAddingProduct] = useState(null);
  const itemDialog = useModalFocus(Boolean(addingProduct), () => setAddingProduct(null));
  const [peopleCount, setPeopleCount] = useState(1);
  const [napkinCount, setNapkinCount] = useState(NAPKIN_MIN_QTY);
  const [justAdded, setJustAdded] = useState(false);

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
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    openBag();
    return true;
  };

  const startAdd = (product) => {
    setDesignDraft(designDraftFor(product));
    setDesignError('');
    setPeopleCount(1);
    setNapkinCount(NAPKIN_MIN_QTY);
    setAddingProduct(product);
  };

  // Headline price follows the design toggle so it matches the bag line.
  const headlinePrice = (product) => (
    <p className="item-price">${(basePrice(product) + (designDraft.wantsDesign ? designFee(product) : 0)).toFixed(2)}</p>
  );

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
        <p className="helper">Add extra embroidered pieces to this bundle. {BUNDLE_ADDONS.map((addon) => `${addon.label.replace('Additional ', '')} $${addon.price}`).join(', ')} each.</p>
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
        <p className="helper">Priced per napkin. {NAPKIN_MIN_QTY} minimum. ${napkinUnitPrice(10)} each for 10–19, ${napkinUnitPrice(20)} each for 20–39, ${napkinUnitPrice(40)} each for 40–59, and ${napkinUnitPrice(60)} each for 60 and up.</p>
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
              ? `Design details are required. A $${PACKAGE_ORDER_DESIGN_FEE} design fee is added once per order.`
              : isTieredNapkins(product)
                ? `Design details are required. A $${NAPKIN_ORDER_DESIGN_FEE} design fee is added once per order.`
                : isMonogramTowel(product)
                  ? 'Choose 1 letter and 1 thread color.'
                  : 'Customization is included. Choose a theme and design details, then add any extras below.'}
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
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)), [products, categoryId]);
  const counts = useMemo(() => Object.fromEntries(SHOP_HUB.map((hub) => [hub.id, products.filter((item) => item.category === hub.id).length])), [products]);
  const siblings = activeProduct ? visibleProducts.filter((item) => item.id !== activeProduct.id).slice(0, 3) : [];
  const moreProducts = siblings.length > 0 || !activeProduct ? siblings : FAVORITE_SLUGS
    .map((slug) => products.find((item) => item.slug === slug))
    .filter((item) => item && item.id !== activeProduct.id)
    .slice(0, 3);

  const hubCard = (item, index) => (
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
      <StoreImage src={item.image} alt={item.name} fetchPriority={index === 0 && !activeCategory ? 'high' : undefined} sizes="(min-width: 1100px) 23vw, (min-width: 640px) 30vw, 46vw" />
      <div>
        {counts[item.id] === 0 ? <p className="eyebrow">COMING SOON</p> : item.preorder && <p className="eyebrow">PREORDER</p>}
        <h2>{item.name}</h2>
        <p>{item.detail}</p>
        {counts[item.id] > 0 && <p className="hub-count">{counts[item.id]} {counts[item.id] === 1 ? 'piece' : 'pieces'}</p>}
      </div>
    </Link>
  );
  const moreCollections = activeCategory ? SHOP_HUB.filter((item) => item.id !== activeCategory.id && counts[item.id] > 0) : [];

  return (
    <main className={`shop-page${activeProduct ? ' is-item' : activeCategory ? ' is-collection' : ' is-hub'}`}>
      {activeProduct ? (
        <section className="item-page">
          <nav aria-label="Breadcrumb" className="breadcrumb">
            <Link href="/shop">Shop</Link>
            {activeCategory && <> › <Link href={`/shop/${activeCategory.id}`}>{activeCategory.name}</Link></>}
            {' › '}<span aria-current="page">{activeProduct.name}</span>
          </nav>
          <div className="item-page-layout">
            <ProductGallery images={productImages(activeProduct)} name={activeProduct.name} />
            <div className="item-page-copy">
              {activeCategory?.preorder && <p className="eyebrow">PREORDER</p>}
              <h1>{activeProduct.name}</h1>
              <p>{activeProduct.detail}</p>
              {isPerPersonPackage(activeProduct)
                ? peoplePicker(activeProduct)
                : isTieredNapkins(activeProduct)
                  ? napkinPicker(activeProduct)
                  : isBabyBundle(activeProduct)
                    ? addonPicker(activeProduct)
                    : headlinePrice(activeProduct)}
              {designSection(activeProduct)}
              <TurnaroundNote />
              <div className="item-cta">
                {designError && <p className="form-error" role="alert">{designError}</p>}
                <button className={`studio-primary${justAdded ? ' is-saved' : ''}`} type="button" onClick={() => addToCart(activeProduct, designDraft)}>{justAdded ? 'Added to bag' : 'Add to bag'}</button>
              </div>
            </div>
          </div>
          {moreProducts.length > 0 && (
            <section className="feature-reel home-favorites">
              <h2>{siblings.length > 0 ? `More from ${activeCategory?.name || 'the shop'}` : 'A few of my favorites'}</h2>
              <FavoritesCarousel
                items={moreProducts.map((product) => ({
                  href: productHref(product),
                  image: product.image,
                  name: product.name,
                  price: priceLabel(product),
                }))}
              />
            </section>
          )}
        </section>
      ) : !activeCategory ? (
        <>
          <section className="shop-intro">
            <p className="eyebrow">THE LOVE & CO. SHOP</p>
            <h1>Personal pieces, <i>made for your people.</i></h1>
            <p>Choose a collection, make it yours, and I’ll carefully bring it to life.</p>
            <TurnaroundNote />
          </section>
          <section className="shop-products shop-hub">
            {SHOP_HUB.map(hubCard)}
          </section>
        </>
      ) : (
        <>
          <section className="catalog-hero">
            <Link href="/shop" onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openCategory(null); }}>← All collections</Link>
            <p className="eyebrow">THE LOVE & CO. SHOP</p>
            <h1>{activeCategory.name}</h1>
            <p>{activeCategory.detail}</p>
            <TurnaroundNote />
          </section>
          <section className="catalog-controls">
            {visibleProducts.length > 0 && <p>{visibleProducts.length} {visibleProducts.length === 1 ? 'piece' : 'pieces'}</p>}
          </section>
          <section className="shop-products catalog-products">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product.id}>
                <ProductGallery
                  compact
                  priority={index === 0}
                  images={productImages(product)}
                  name={product.name}
                  onActivate={() => openItem(product)}
                />
                <Link href={productHref(product)} onClick={(event) => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openItem(product); }}>
                  <div>
                    {activeCategory.preorder && <p className="eyebrow">PREORDER</p>}
                    <h2>{product.name}</h2>
                    <p>{product.detail}</p>
                  </div>
                </Link>
                <div className="product-bottom">
                  <strong>{priceLabel(product)}</strong>
                  <button onClick={() => startAdd(product)} type="button">Add to bag <Plus /></button>
                </div>
              </article>
            ))}
          </section>
          {visibleProducts.length === 0 && (
            <div className="empty-catalog">
              <p>New pieces for this collection are still on the hoop. If you have something in mind, I’d love to stitch it just for you.</p>
              <div className="inline-actions">
                <Link className="soft-button" href="/custom">Ask about a custom piece</Link>
                <Link className="outline-button" href="/shop">Browse all collections</Link>
              </div>
            </div>
          )}
          {activeCategory.story && (
            <section className="split-story collection-story">
              <StoreImage src={activeCategory.story.image} alt={activeCategory.name} sizes="(min-width: 800px) 45vw, 100vw" />
              <div>
                <p className="eyebrow">A NOTE FROM ANNA</p>
                <h2>{activeCategory.story.heading}</h2>
                <p>{activeCategory.story.body}</p>
                <Link href="/custom" className="soft-button">Start a custom piece</Link>
              </div>
            </section>
          )}
          {moreCollections.length > 0 && (
            <section className="collection-more">
              <h2>More collections</h2>
              <div className="shop-products shop-hub">
                {moreCollections.map(hubCard)}
              </div>
            </section>
          )}
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
                  : headlinePrice(addingProduct)}
            {designSection(addingProduct)}
            {designError && <p className="form-error" role="alert">{designError}</p>}
            <button className="studio-primary" type="button" onClick={() => addToCart(addingProduct, designDraft)}>Add to bag</button>
          </section>
        </div>
      )}
    </main>
  );
}
