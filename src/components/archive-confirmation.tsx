"use client";

import { Archive, LoaderCircle, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/locale-provider";

export function ArchiveConfirmation({
  title,
  description,
  pending,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="modal narrow" role="alertdialog" aria-modal="true" aria-labelledby="archive-title" aria-describedby="archive-description">
        <div className="modal-header">
          <div><h2 id="archive-title">{title}</h2><p>{t("products.archiveDialogHint")}</p></div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label={t("common.close")}><X size={17} /></button>
        </div>
        <div className="modal-body">
          <div className="notice warning"><Archive size={17} /><div><strong>{t("archiveConfirmation.title")}</strong><p id="archive-description">{description}</p></div></div>
        </div>
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onCancel} disabled={pending}>{t("common.cancel")}</button>
          <button className="button button-danger" onClick={onConfirm} disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}{pending ? t("archiveConfirmation.pending") : t("archiveConfirmation.confirm")}</button>
        </div>
      </div>
    </div>
  );
}
