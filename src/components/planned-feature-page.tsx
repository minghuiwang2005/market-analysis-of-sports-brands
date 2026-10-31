type PlannedFeaturePageProps = {
  section: string;
  title: string;
  description: string;
};

export function PlannedFeaturePage({ section, title, description }: PlannedFeaturePageProps) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{section}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">{description}</p>
        </div>
      </div>
      <section className="data-card feature-state" aria-label={`${title}状态`}>
        <span className="feature-state-label">尚未启用</span>
        <h2>{title}功能尚未开放</h2>
        <p>此页面已加入导航。相关数据和功能接入后，将在这里展示。</p>
      </section>
    </>
  );
}
