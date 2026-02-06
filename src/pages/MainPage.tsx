import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Music, Calendar, AlertCircle } from 'lucide-react';
import PinVerification from '../components/PinVerification';

interface CompanyData {
    idCompany: number;
    name: string;
    urlImagen: string;
    keyCompany: string;
}

interface TokenPayload {
    KeyCompany: string;
    EventToken?: string;
    UserName?: string;
    PIN?: string;
}

export default function MainPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [payload, setPayload] = useState<TokenPayload | null>(null);
    const [showPinVerification, setShowPinVerification] = useState(false);
    const [redirectTo, setRedirectTo] = useState<string>('');

    useEffect(() => {
        validateToken();
    }, []);

    const validateToken = async () => {
        const token = searchParams.get('token');

        if (!token) {
            setError('No se proporcionó token de acceso');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch('/api/auth/validate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Token inválido');
                setLoading(false);
                return;
            }

            setCompany(data.company);
            setPayload(data.payload);
            setRedirectTo(data.redirectTo);

            // Handle redirects
            if (data.valid) {
                if (data.redirectTo === 'music' && data.payload.EventToken) {
                    navigate(`/music/${data.payload.EventToken}`);
                } else if (data.redirectTo === 'events') {
                    navigate('/events', { state: { company: data.company, userName: data.payload.UserName } });
                }
            } else if (data.redirectTo === 'pin-verification') {
                setShowPinVerification(true);
            }

            setLoading(false);
        } catch (err) {
            setError('Error de conexión con el servidor');
            setLoading(false);
        }
    };

    const handlePinVerified = (token: string) => {
        // Save token to localStorage for future use
        localStorage.setItem('authToken', token);

        // Navigate to events after PIN verification
        navigate('/events', {
            state: {
                company,
                userName: payload?.UserName,
                token
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <div className="spinner mb-6" />
                <p className="text-xl text-gray-300 font-orbitron">Validando acceso...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <div className="glass-card p-8 max-w-md w-full text-center fade-in">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-orbitron font-bold mb-4 text-red-400">Error de Acceso</h1>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-neon"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Company Logo/Image */}
            {company?.urlImagen && (
                <div className="mb-8 fade-in">
                    <img
                        src={company.urlImagen}
                        alt={company.name}
                        className="max-w-xs max-h-40 object-contain rounded-lg shadow-2xl"
                        onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                        }}
                    />
                </div>
            )}

            {/* Company Name */}
            <h1 className="text-4xl md:text-5xl font-orbitron font-bold mb-4 text-center neon-text-purple fade-in">
                {company?.name || 'AppEvents'}
            </h1>

            <p className="text-xl text-gray-400 mb-8 text-center fade-in" style={{ animationDelay: '0.2s' }}>
                Plataforma de Eventos y Música
            </p>

            {/* PIN Verification Section */}
            {showPinVerification && payload?.UserName && (
                <div className="w-full max-w-md fade-in" style={{ animationDelay: '0.3s' }}>
                    <PinVerification
                        userName={payload.UserName}
                        keyCompany={company?.keyCompany || ''}
                        onVerified={handlePinVerified}
                    />
                </div>
            )}

            {/* Navigation Options (shown when not in verification flow) */}
            {!showPinVerification && company && (
                <div className="flex flex-col sm:flex-row gap-4 fade-in" style={{ animationDelay: '0.4s' }}>
                    <button
                        onClick={() => navigate('/events', { state: { company } })}
                        className="btn-neon flex items-center gap-3 px-8"
                    >
                        <Calendar className="w-5 h-5" />
                        Ver Eventos
                    </button>
                    <button
                        onClick={() => navigate('/music')}
                        className="btn-neon btn-neon-pink flex items-center gap-3 px-8"
                    >
                        <Music className="w-5 h-5" />
                        Lista de Música
                    </button>
                </div>
            )}

            {/* Decorative Elements */}
            <div className="fixed top-10 left-10 opacity-20">
                <div className="disco-ball" />
            </div>
            <div className="fixed bottom-10 right-10 opacity-20">
                <div className="disco-ball" style={{ animationDelay: '-2s' }} />
            </div>
        </div>
    );
}
