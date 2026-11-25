import React from 'react';
import { X, BookOpen } from 'lucide-react';
import { renderRichJapaneseText } from '../utils/rubyText';

interface StudyNotesModalProps {
  title: string;
  notes: string;
  showFurigana: boolean;
  onClose: () => void;
}

export const StudyNotesModal: React.FC<StudyNotesModalProps> = ({
  title,
  notes,
  showFurigana,
  onClose,
}) => {
  const lines = notes.replace(/\r\n/g, '\n').split('\n');

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-panel modal-panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <BookOpen size={20} />
            <h3>Peta Cepat &amp; Catatan Materi — {title}</h3>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body study-notes-body">
          {lines.map((raw, idx) => {
            const line = raw.trim();
            if (!line) return <div key={idx} className="notes-spacer" />;
            if (/^###\s+/.test(line)) {
              return (
                <h4 key={idx} className="notes-heading">
                  {renderRichJapaneseText(line.replace(/^###\s+/, ''), showFurigana)}
                </h4>
              );
            }
            if (/^##\s+/.test(line)) {
              return (
                <h3 key={idx} className="notes-heading">
                  {renderRichJapaneseText(line.replace(/^##\s+/, ''), showFurigana)}
                </h3>
              );
            }
            if (/^[*-]\s+/.test(line)) {
              return (
                <div key={idx} className="notes-bullet">
                  <span className="notes-bullet__dot">•</span>
                  <div>
                    {renderRichJapaneseText(line.replace(/^[*-]\s+/, ''), showFurigana)}
                  </div>
                </div>
              );
            }
            return (
              <p key={idx} className="notes-para">
                {renderRichJapaneseText(line, showFurigana)}
              </p>
            );
          })}
        </div>
        <div className="modal-footer">
          <button className="studio-btn studio-btn--primary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
