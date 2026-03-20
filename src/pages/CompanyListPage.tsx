import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Building2,
    Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Company {
    idCompany: number;
    name: string;
    keyCompany: string;
    active: boolean;
    url: string | null;
    urlImagen: string | null;
}

export default function CompanyListPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch('/api/company', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success) {
                setCompanies(data.companies);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(t('company.error_load'));
        } finally {
            setLoading(false);
        }
    };

    const handleEditCompany = (company: Company) => {
        const token = localStorage.getItem('authToken');
        navigate('/company', { state: { company, token, administrator: true } });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-orbitron font-bold neon-text-purple">
                                Compañias
                            </h1>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="glass-card p-4 mb-6 border-red-500/30 text-red-400">
                        {error}
                    </div>
                )}

                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Compañia</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Clave</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Estatus</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((company) => (
                                    <tr key={company.idCompany} className="border-b border-white/5 hover:bg-white/5 transition">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center overflow-hidden">
                                                    {company.urlImagen ? (
                                                        <img src={company.urlImagen} alt={company.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Building2 className="w-4 h-4 text-gray-400" />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-white">{company.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400 font-mono text-sm">
                                            {company.keyCompany}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs w-fit ${company.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {company.active ? 'Activa' : 'Inactiva'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-2 items-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditCompany(company)}
                                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-gray-400 hover:text-white"
                                                        title="Editar compañia"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {companies.length === 0 && !loading && (
                            <div className="text-center py-16">
                                <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                                <p className="text-xl text-gray-400">No hay compañias registradas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
