"use client";

import { Archive, LoaderCircle, X } from "lucide-react";

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
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div className="modal narrow" role="alertdialog" aria-modal="true" aria-labelledby="archive-title" aria-describedby="archive-description">
        <div className="modal-header">
          <div><h2 id="archive-title">{title}</h2><p>记录会保留在 Neon，可在归档视图恢复。</p></div>
          <button className="icon-button" type="button" onClick={onCancel} aria-label="关闭"><X size={17} /></button>
        </div>
        <div className="modal-body">
          <div className="notice warning"><Archive size={17} /><div><strong>确认归档？</strong><p id="archive-description">{description}</p></div></div>
        </div>
        <div className="modal-footer">
          <button className="button button-secondary" onClick={onCancel} disabled={pending}>取消</button>
          <button className="button button-danger" onClick={onConfirm} disabled={pending}>{pending && <LoaderCircle size={14} className="animate-spin" />}{pending ? "归档中" : "确认归档"}</button>
        </div>
      </div>
    </div>
  );
}
