import { memo } from 'react';

function ChalkboardBackground() {
  return (
    <div className="chalkboard-bg" aria-hidden="true">
      <div className="chalkboard-bg__texture" />
      <div className="chalkboard-bg__dust" />
      <div className="chalkboard-bg__vignette" />
    </div>
  );
}

export default memo(ChalkboardBackground);
