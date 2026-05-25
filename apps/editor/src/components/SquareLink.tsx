import { useState } from 'react';
import type { SquareRef } from '@dishboard/shared';
import { SquarePicker, type SquarePick } from './SquarePicker.js';

export function SquareLink({
  squareRef,
  showAvailability = true,
  onLink,
  onUnlink,
  onChangeTrackPrice,
  onChangeTrackAvailability,
}: {
  squareRef: SquareRef | undefined;
  showAvailability?: boolean;
  onLink: (pick: SquarePick) => void;
  onUnlink: () => void;
  onChangeTrackPrice: (on: boolean) => void;
  onChangeTrackAvailability?: (on: boolean) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="square-link">
      <div className="square-link__head">
        <span className="field__label">Square</span>
        {squareRef ? (
          <button type="button" className="link-button" onClick={onUnlink}>
            Unlink
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--secondary btn--small"
            onClick={() => setPickerOpen(true)}
          >
            + Link to Square
          </button>
        )}
      </div>

      {squareRef && (
        <>
          <div className="square-link__meta">
            <code>{squareRef.itemId}</code>
          </div>
          <div className="square-link__toggles">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={squareRef.trackPrice}
                onChange={(e) => onChangeTrackPrice(e.target.checked)}
              />
              <span>Sync price</span>
            </label>
            {showAvailability && onChangeTrackAvailability && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={squareRef.trackAvailability}
                  onChange={(e) => onChangeTrackAvailability(e.target.checked)}
                />
                <span>Sync availability</span>
              </label>
            )}
            <button type="button" className="link-button" onClick={() => setPickerOpen(true)}>
              Change…
            </button>
          </div>
        </>
      )}

      {pickerOpen && (
        <SquarePicker
          onPick={(pick) => {
            onLink(pick);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
