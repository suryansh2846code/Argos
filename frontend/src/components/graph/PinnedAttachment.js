import { memo } from 'react';
import { getYouTubeEmbedUrl, isYouTubeUrl } from '../../graph/transformers';

// ─────────────────────────────────────────────────────────────────────────────
// Hash-based rotation for pinned-paper tilt
// ─────────────────────────────────────────────────────────────────────────────

function hashRotation(id) {
  let hash = 0;
  const str = String(id);
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 7) - 3) * 0.8;
}

function PushPin() {
  return <div className="push-pin" aria-hidden="true" />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Full-size pinned-paper renderers
//  These are used on BOTH freeform and debate boards.
//  The pinned-paper aesthetic is intentional and must be preserved.
// ─────────────────────────────────────────────────────────────────────────────

function PinnedImage({ attachment, onExpand }) {
  const src      = attachment.file_url;
  const rotation = hashRotation(attachment.id);
  const caption  = attachment.title || '';

  return (
    <figure
      className="pinned-paper pinned-paper--image"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <PushPin />
      <button type="button" className="pinned-paper__media-btn" onClick={() => onExpand?.(attachment)}>
        <img src={src} alt={caption || 'Evidence'} loading="lazy" decoding="async" />
      </button>
      {caption && <figcaption className="pinned-paper__caption">{caption}</figcaption>}
    </figure>
  );
}

function PinnedGif({ attachment, onExpand }) {
  const src      = attachment.file_url;
  const rotation = hashRotation(attachment.id);

  return (
    <figure
      className="pinned-paper pinned-paper--gif"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <PushPin />
      <button type="button" className="pinned-paper__media-btn" onClick={() => onExpand?.(attachment)}>
        <img src={src} alt="GIF evidence" loading="lazy" decoding="async" />
      </button>
    </figure>
  );
}

function PinnedVideo({ attachment, onExpand }) {
  const rotation = hashRotation(attachment.id);
  const ytEmbed  = isYouTubeUrl(attachment.external_url)
    ? getYouTubeEmbedUrl(attachment.external_url)
    : null;

  if (ytEmbed) {
    return (
      <figure
        className="pinned-paper pinned-paper--video"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <PushPin />
        <div className="pinned-paper__video-wrap">
          <iframe
            src={ytEmbed}
            title={attachment.title || 'Video'}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        {attachment.title && (
          <figcaption className="pinned-paper__caption">{attachment.title}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <figure
      className="pinned-paper pinned-paper--video"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <PushPin />
      <button
        type="button"
        className="pinned-paper__media-btn pinned-paper__media-btn--video"
        onClick={() => onExpand?.(attachment)}
      >
        {attachment.file_url ? (
          <video src={attachment.file_url} muted preload="metadata" />
        ) : null}
        <span className="pinned-paper__play">▶</span>
      </button>
    </figure>
  );
}

function PinnedLink({ attachment }) {
  const rotation = hashRotation(attachment.id);
  const label    = attachment.title || attachment.external_url;

  return (
    <figure
      className="pinned-paper pinned-paper--link"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <PushPin />
      <a
        href={attachment.external_url}
        target="_blank"
        rel="noopener noreferrer"
        className="pinned-paper__link-card"
      >
        <span className="pinned-paper__link-label">Source</span>
        <span className="pinned-paper__link-title">{label}</span>
        <span className="pinned-paper__link-url">{attachment.external_url}</span>
      </a>
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PinnedAttachment — dispatches to the correct renderer by type
// ─────────────────────────────────────────────────────────────────────────────

function PinnedAttachment({ attachment, onExpand }) {
  switch (attachment.attachment_type) {
    case 'image': return <PinnedImage attachment={attachment} onExpand={onExpand} />;
    case 'gif':   return <PinnedGif   attachment={attachment} onExpand={onExpand} />;
    case 'video': return <PinnedVideo attachment={attachment} onExpand={onExpand} />;
    case 'link':  return <PinnedLink  attachment={attachment} />;
    default:      return null;
  }
}

export default memo(PinnedAttachment);
