type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  side?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, side }: PageHeaderProps) {
  return (
    <header className="topbar page-topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {side ? <div className="page-header-side">{side}</div> : null}
    </header>
  );
}
