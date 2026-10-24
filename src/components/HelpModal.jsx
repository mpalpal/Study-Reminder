import { useI18n } from "../i18n/I18nProvider.jsx";
import Modal from "./Modal.jsx";

/** 使い方の説明（文言は辞書の "help.sections"） */
export default function HelpModal({ onClose }) {
  const { t } = useI18n();

  return (
    <Modal title={t("help.title")} onClose={onClose}>
      {t("help.sections").map((section) => (
        <section key={section.title} className="modal-section">
          <h3>{section.title}</h3>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </Modal>
  );
}
