import { useState } from 'react';
import { isYouTubeUrl } from '../../graph/transformers';
import AttachmentPreview from './AttachmentPreview';

function LinkCard({ attachment }) {
  const label = attachment.title || attachment.external_url;
  return (
    <a
      href={attachment.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className="attachment-card attachment-card--link"
    >
      <span className="attachment-card__icon">🔗</span>
      <span className="attachment-card__label">{label}</span>
    </a>
  );
}

function MediaThumb({ attachment, onExpand }) {
  const src = attachment.file_url;
  const isGif = attachment.attachment_type === 'gif';

  return (
    <button
      type="button"
      className="attachment-thumb"
      onClick={() => onExpand(attachment)}
    >
      {isGif ? (
        <img src={src} alt="" className="attachment-thumb__img" />
      ) : attachment.attachment_type === 'image' ? (
        <img src={src} alt="" className="attachment-thumb__img" />
      ) : (
        <span className="attachment-thumb__video">▶ Video</span>
      )}
    </button>
  );
}

export default function AttachmentList({ attachments, compact = false }) {
  const [preview, setPreview] = useState(null);

  if (!attachments?.length) return null;

  const links = attachments.filter((a) => a.attachment_type === 'link');
  const media = attachments.filter((a) => a.attachment_type !== 'link');

  return (
    <div className={`attachment-list ${compact ? 'attachment-list--compact' : ''}`}>
      {media.map((att) =>
        att.attachment_type === 'video' && att.external_url && isYouTubeUrl(att.external_url) ? (
          <button
            key={att.id}
            type="button"
            className="attachment-thumb attachment-thumb--yt"
            onClick={() => setPreview(att)}
          >
            ▶ YouTube
          </button>
        ) : (
          <MediaThumb key={att.id} attachment={att} onExpand={setPreview} />
        )
      )}
      {!compact &&
        links.map((att) => <LinkCard key={att.id} attachment={att} />)}
      {compact && links.length > 0 && (
        <span className="attachment-list__link-count">{links.length} link(s)</span>
      )}
      {preview && (
        <AttachmentPreview attachment={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}
