import { useState } from 'react';

const TYPES = [
  { value: 'image', label: 'Image' },
  { value: 'gif', label: 'GIF' },
  { value: 'video', label: 'Video file' },
  { value: 'link', label: 'Link' },
];

export default function AttachmentForm({ nodeId, onUpload, onAddLink, isSaving }) {
  const [mode, setMode] = useState('file');
  const [fileType, setFileType] = useState('image');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  async function handleFileSubmit(event) {
    event.preventDefault();
    const fileInput = event.target.elements.file;
    if (!fileInput.files?.[0]) return;

    const formData = new FormData();
    formData.append('node', nodeId);
    formData.append('attachment_type', fileType);
    formData.append('file', fileInput.files[0]);
    await onUpload(formData);
    event.target.reset();
  }

  async function handleLinkSubmit(event) {
    event.preventDefault();
    if (!linkUrl.trim()) return;
    await onAddLink({
      node: nodeId,
      attachment_type: 'link',
      external_url: linkUrl.trim(),
      title: linkTitle.trim(),
    });
    setLinkUrl('');
    setLinkTitle('');
  }

  async function handleVideoLinkSubmit(event) {
    event.preventDefault();
    if (!videoUrl.trim()) return;
    await onAddLink({
      node: nodeId,
      attachment_type: 'video',
      external_url: videoUrl.trim(),
      title: 'Video',
    });
    setVideoUrl('');
  }

  return (
    <div className="attachment-form">
      <div className="attachment-form__tabs">
        <button
          type="button"
          className={mode === 'file' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('file')}
        >
          Upload
        </button>
        <button
          type="button"
          className={mode === 'link' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('link')}
        >
          Link
        </button>
        <button
          type="button"
          className={mode === 'video' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('video')}
        >
          YouTube
        </button>
      </div>

      {mode === 'file' && (
        <form onSubmit={handleFileSubmit} className="form">
          <label className="field">
            <span>Type</span>
            <select value={fileType} onChange={(e) => setFileType(e.target.value)}>
              {TYPES.filter((t) => t.value !== 'link').map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>File</span>
            <input name="file" type="file" accept="image/*,video/*,.gif" required />
          </label>
          <button type="submit" className="btn btn--primary btn--sm" disabled={isSaving}>
            Upload
          </button>
        </form>
      )}

      {mode === 'link' && (
        <form onSubmit={handleLinkSubmit} className="form">
          <label className="field">
            <span>URL</span>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              required
            />
          </label>
          <label className="field">
            <span>Title (optional)</span>
            <input
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Source title"
            />
          </label>
          <button type="submit" className="btn btn--primary btn--sm" disabled={isSaving}>
            Add link
          </button>
        </form>
      )}

      {mode === 'video' && (
        <form onSubmit={handleVideoLinkSubmit} className="form">
          <label className="field">
            <span>YouTube URL</span>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </label>
          <button type="submit" className="btn btn--primary btn--sm" disabled={isSaving}>
            Add video
          </button>
        </form>
      )}
    </div>
  );
}
