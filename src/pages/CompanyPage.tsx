import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    Building2,
    Globe,
    Instagram,
    Facebook,
    Image as ImageIcon,
    Shield,
    CheckCircle,
    AlertCircle,
    KeyRound,
    Copy,
    ExternalLink
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Company {
    idCompany: number;
    name: string;
    active: boolean;
    url: string | null;
    urlImagen: string | null;
    keyCompany: string;
    urlInstagram: string | null;
    urlFacebook: string | null;
    webPage: string | null;
    validityDate: string | null;
}

export default function CompanyPage() {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generationSuccess, setGenerationSuccess] = useState<{ url: string } | null>(null);

    // Get user info from localStorage or state
    // In this app, we saved the user into location.state during login or we can check localStorage
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const storedUserAdmin = location.state?.administrator;
        //console.log("User:", storedUser);
        if (storedUserAdmin) {
            const admin = JSON.parse(storedUserAdmin);
            //console.log("Stored User:", user);
            setIsAdmin(admin);
        }

        const companyData = location.state?.company;
        // console.log("   companyData:", companyData);
        if (companyData) {
            fetchCompanyDetails(companyData.idCompany);
        } else {
            setError(t('company.error_no_company_context'));
            setLoading(false);
        }
    }, []);

    const fetchCompanyDetails = async (id: number) => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/company/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setCompany(data.company);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(t('company.error_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/company/${company.idCompany}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(company)
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(t('company.save_success'));
                setCompany(data.company);
                // Update local company context if needed
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(t('company.error_save'));
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof Company, value: any) => {
        if (!company) return;
        setCompany({ ...company, [field]: value });
    };

    const handleGenerateAccess = async () => {
        if (!company) return;
        setGenerating(true);
        setGenerationSuccess(null);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/company/${company.idCompany}/generate-token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setGenerationSuccess({ url: data.url });
                setSuccess(t('company.access_generated') || 'Acceso generado y correo enviado exitosamente');
            } else {
                if (data.code === 'LICENSE_EXPIRED') {
                    const date = new Date(data.validityDate).toLocaleDateString();
                    setError(t('company.license_expired', { date }));
                } else {
                    setError(data.error || 'Error generating access token');
                }
            }
        } catch (err) {
            setError('Error generating access token');
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                alert('Copiado al portapapeles / Copied to clipboard');
            } else {
                // Fallback for non-secure contexts (e.g. local IP testing over HTTP)
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "absolute";
                textArea.style.left = "-999999px";
                document.body.prepend(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    alert('Copiado al portapapeles / Copied to clipboard');
                } catch (error) {
                    console.error('Fallback copy error:', error);
                    alert('Error al copiar al portapapeles');
                } finally {
                    textArea.remove();
                }
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Error al copiar al portapapeles');
        }
    };

    const openInNewTab = (url: string) => {
        window.open(url, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    if (!company && error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-center">
                <div className="glass-card max-w-md p-8">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">{t('company.error_title')}</h2>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button onClick={() => navigate(-1)} className="btn-neon w-full flex items-center justify-center gap-2">
                        <ArrowLeft className="w-5 h-5" /> {t('common.back')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-orbitron font-bold neon-text-purple">
                                {t('company.title')}
                            </h1>
                            <p className="text-gray-400 mt-1">{company?.name}</p>
                        </div>

                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-disco-purple/20 text-disco-purple border border-disco-purple/30 text-sm font-semibold">
                            <Shield className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {success && (
                    <div className="glass-card p-4 mb-6 border-green-500/30 text-green-400 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5" />
                        {success}
                    </div>
                )}

                {error && (
                    <div className="glass-card p-4 mb-6 border-red-500/30 text-red-400 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}



                {generationSuccess && (
                    <div className="glass-card p-4 mb-6 border-disco-cyan/30 text-disco-cyan flex items-center gap-3">
                        <KeyRound className="w-5 h-5 shrink-0" />
                        <span className="truncate max-w-full text-sm">{generationSuccess.url}</span>
                        <div className="flex gap-2 ml-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => copyToClipboard(generationSuccess.url)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded transition text-gray-300 hover:text-white"
                                title="Copiar URL"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => openInNewTab(generationSuccess.url)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded transition text-gray-300 hover:text-white"
                                title="Abrir en nueva pestaña"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {isAdmin && (
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={handleGenerateAccess}
                            disabled={generating || saving}
                            className="px-6 py-2 rounded-lg border border-disco-cyan/30 text-disco-cyan hover:bg-disco-cyan/10 transition flex items-center gap-2 mr-auto"
                        >
                            {generating ? (
                                <div className="w-5 h-5 border-2 border-disco-cyan/30 border-t-disco-cyan rounded-full animate-spin" />
                            ) : (
                                <KeyRound className="w-5 h-5" />
                            )}
                            {t('company.generate_access')}
                        </button>
                    </div>
                )}
                <form onSubmit={handleSave} className="space-y-6">
                    {/* General Section */}
                    <div className="glass-card p-6 border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <Building2 className="w-6 h-6 text-disco-purple" />
                            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                {t('company.section_general')}
                            </h2>
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_name')}</label>
                                <input
                                    type="text"
                                    value={company?.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    disabled={!isAdmin}
                                    className={`input-neon ${!isAdmin ? 'opacity-70 cursor-not-allowed bg-black/40' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_key')}</label>
                                <input
                                    type="text"
                                    value={company?.keyCompany || ''}
                                    onChange={(e) => handleChange('keyCompany', e.target.value)}
                                    disabled={!isAdmin}
                                    className={`input-neon font-mono ${!isAdmin ? 'opacity-70 cursor-not-allowed bg-black/40' : ''}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_url')}</label>
                                <input
                                    type="text"
                                    value={company?.url || ''}
                                    onChange={(e) => handleChange('url', e.target.value)}
                                    disabled={!isAdmin}
                                    className={`input-neon ${!isAdmin ? 'opacity-70 cursor-not-allowed bg-black/40' : ''}`}
                                />
                            </div>
                            <div className="flex items-center gap-4 h-full pt-4">
                                <label className="relative inline-flex items-center cursor-pointer pointer-events-auto">
                                    <input
                                        type="checkbox"
                                        checked={company?.active || false}
                                        onChange={(e) => handleChange('active', e.target.checked)}
                                        disabled={!isAdmin}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-disco-purple ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                    <span className="ml-3 text-sm font-medium text-gray-400">{t('company.field_active')}</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-4 h-full pt-4">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_validity_date')}</label>
                                <input
                                    type="text"
                                    value={company?.validityDate || ''}
                                    onChange={(e) => handleChange('validityDate', e.target.value)}
                                    disabled={true}
                                    className={`input-neon ${!isAdmin ? 'opacity-70 cursor-not-allowed bg-black/40' : ''}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Branding & Media Section */}
                    <div className="glass-card p-6 border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <ImageIcon className="w-6 h-6 text-disco-pink" />
                            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                {t('company.section_branding')}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_logo_url')}</label>
                                <div className="flex gap-4 items-start">
                                    <input
                                        type="text"
                                        value={company?.urlImagen || ''}
                                        onChange={(e) => handleChange('urlImagen', e.target.value)}
                                        className="input-neon flex-1"
                                        placeholder="https://example.com/logo.png"
                                    />
                                    {company?.urlImagen && (
                                        <div className="w-12 h-12 rounded border border-white/10 overflow-hidden bg-black/20 flex-shrink-0">
                                            <img src={company.urlImagen} alt="Logo Preview" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Social Section */}
                    <div className="glass-card p-6 border-white/5">
                        <div className="flex items-center gap-3 mb-6">
                            <Globe className="w-6 h-6 text-disco-cyan" />
                            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                                {t('company.section_social')}
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_web')}</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={company?.webPage || ''}
                                        onChange={(e) => handleChange('webPage', e.target.value)}
                                        className="input-neon-icon pl-10"
                                        placeholder="https://example.com"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_instagram')}</label>
                                <div className="relative">
                                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={company?.urlInstagram || ''}
                                        onChange={(e) => handleChange('urlInstagram', e.target.value)}
                                        className="input-neon-icon pl-10"
                                        placeholder="https://instagram.com/user"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('company.field_facebook')}</label>
                                <div className="relative">
                                    <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={company?.urlFacebook || ''}
                                        onChange={(e) => handleChange('urlFacebook', e.target.value)}
                                        className="input-neon-icon pl-10"
                                        placeholder="https://facebook.com/page"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pb-8">

                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="px-6 py-2 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || generating}
                            className="btn-neon flex items-center gap-2 px-8"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
