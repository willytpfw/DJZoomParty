import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('en') ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-0 right-3 z-50 flex items-center gap-2 px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm border border-white/20 text-white text-sm"
    >
      <Globe className="w-3 h-3" />
      {i18n.language.startsWith('en') ? 'ES' : 'EN'}
    </button>
  );
}
