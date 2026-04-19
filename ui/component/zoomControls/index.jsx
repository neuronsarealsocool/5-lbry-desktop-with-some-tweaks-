// @flow
import React from 'react';
import { changeZoomFactor, ZOOM } from 'util/zoomWindow';

function ZoomInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

export default function ZoomControls() {
  return (
    <div className="zoom-controls">
      <button className="zoom-controls__btn" onClick={() => changeZoomFactor(ZOOM.INCREMENT)} title="Zoom In">
        <ZoomInIcon />
      </button>
      <button className="zoom-controls__btn" onClick={() => changeZoomFactor(ZOOM.DECREMENT)} title="Zoom Out">
        <ZoomOutIcon />
      </button>
    </div>
  );
}
