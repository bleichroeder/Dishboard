import type { Item, SectionStyle, SectionVariant } from '@dishboard/shared';

export function SectionVariantView({
  variant,
  rotating,
}: {
  variant: SectionVariant;
  rotating: boolean;
}) {
  const visible = variant.items.filter((i) => !i.hidden);
  return (
    <section className={`section section--${variant.style}${rotating ? ' section--rotating' : ''}`}>
      <header className="section__header">
        <h2 className="section__title">{variant.title}</h2>
        {variant.description && <p className="section__description">{variant.description}</p>}
      </header>
      <ul className={`items items--${variant.style}`}>
        {visible.map((item) => (
          <ItemRow key={item.id} item={item} style={variant.style} />
        ))}
      </ul>
    </section>
  );
}

function ItemRow({ item, style }: { item: Item; style: SectionStyle }) {
  const ingredients = item.ingredients.length > 0 ? item.ingredients.join(', ') : null;
  const showIngredients = style !== 'compact' && !!ingredients;
  const showDescription = style !== 'compact' && !!item.description;

  return (
    <li className={`item item--${style}${item.soldOut ? ' item--sold-out' : ''}`}>
      <div className="item__head">
        <span className="item__name">{item.name}</span>
        {item.price && <span className="item__price">{item.price}</span>}
      </div>
      {showDescription && <p className="item__description">{item.description}</p>}
      {showIngredients && <p className="item__ingredients">{ingredients}</p>}
      {item.soldOut && <span className="item__sold-out-badge">Sold out</span>}
    </li>
  );
}
