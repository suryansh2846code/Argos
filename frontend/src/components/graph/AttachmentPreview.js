import { isYouTubeUrl, getYouTubeEmbedUrl } from '../../graph/transformers';

function ImagePreview({ attachment, onClose }) {
  const src = attachment.file_url || attachment.external_url;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="media-preview" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={attachment.title || 'Attachment'} />
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function VideoPreview({ attachment, onClose }) {
  const url = attachment.external_url;
  const embed = isYouTubeUrl(url) ? getYouTubeEmbedUrl(url) : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="media-preview media-preview--video" onClick={(e) => e.stopPropagation()}>
        {embed ? (
          <iframe
            src={embed}
            title={attachment.title || 'Video'}
            allowFullScreen
            frameBorder="0"
          />
        ) : attachment.file_url ? (
          <video src={attachment.file_url} controls />
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open video
          </a>
        )}
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export default function AttachmentPreview({ attachment, onClose }) {
  if (!attachment) return null;

  if (attachment.attachment_type === 'image' || attachment.attachment_type === 'gif') {
    return <ImagePreview attachment={attachment} onClose={onClose} />;
  }

  if (attachment.attachment_type === 'video') {
    return <VideoPreview attachment={attachment} onClose={onClose} />;
  }

  return null;
}
