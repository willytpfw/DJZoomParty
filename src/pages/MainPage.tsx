import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Music, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PinVerification from '../components/PinVerification';

interface CompanyData {
    idCompany: number;
    name: string;
    urlImagen: string;
    keyCompany: string;
}

interface User {
    idUser: number;
    administrator: boolean;
    username: string;
}

interface TokenPayload {
    KeyCompany: string;
    EventToken?: string;
    UserName?: string;
    PIN?: string;
}

export default function MainPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [company, setCompany] = useState<CompanyData | null>(null);
    const [payload, setPayload] = useState<TokenPayload | null>(null);
    const [showPinVerification, setShowPinVerification] = useState(false);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        validateToken();
    }, []);

    const validateToken = async () => {
        const token = searchParams.get('token');

        if (!token) {
            setError(t('main.error_no_token'));
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
                if (data.code === 'LICENSE_EXPIRED') {
                    const date = new Date(data.validityDate).toLocaleDateString();
                    setError(t('main.license_expired', { date }));
                } else {
                    setError(data.error || t('main.error_invalid_token'));
                }
                setLoading(false);
                return;
            }

            //console.log(`  ✓ Datal: ${data.user.administrator.toString()}`);

            setCompany(data.company);
            setPayload(data.payload);
            setUser(data.user);


            // Handle redirects
            // Save the token to localStorage if provided in URL
            const urlToken = searchParams.get('token');
            if (urlToken) {
                localStorage.setItem('authToken', urlToken);
                // console.log('✅ Token saved to localStorage');
            }

            if (data.valid) {
                if (data.redirectTo === 'music' && data.payload.EventToken) {
                    navigate(`/music/${data.payload.EventToken}`);
                } else if (data.redirectTo === 'events') {
                    navigate('/events', { state: { company: data.company, userName: data.payload.UserName, administrator: data.user.administrator } });
                }
            } else if (data.redirectTo === 'pin-verification') {
                setShowPinVerification(true);
            }

            setLoading(false);
        } catch (err) {
            setError(t('main.error_connection'));
            setLoading(false);
        }
    };

    const handlePinVerified = (token: string, user: User) => {
        // Save token to localStorage for future use
        localStorage.setItem('authToken', token);
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }

        // Navigate to events after PIN verification
        navigate('/events', {
            state: {
                company,
                userName: payload?.UserName,
                token,
                administrator: user.administrator
            }
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <div className="spinner mb-6" />
                <p className="text-xl text-gray-300 font-orbitron">{t('main.validating_access')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <div className="glass-card p-8 max-w-md w-full text-center fade-in">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-orbitron font-bold mb-4 text-red-400">{t('main.access_error')}</h1>
                    <p className="text-gray-300 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-neon"
                    >
                        {t('main.retry')}
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
                {t('main.platform_subtitle')}
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
                        onClick={() => navigate('/events', { state: { company, administrator: user?.administrator } })}
                        className="btn-neon flex items-center gap-3 px-8"
                    >
                        <Calendar className="w-5 h-5" />
                        {t('main.view_events')}
                    </button>
                    <button
                        onClick={() => navigate('/music')}
                        className="btn-neon btn-neon-pink flex items-center gap-3 px-8"
                    >
                        <Music className="w-5 h-5" />
                        {t('main.music_list')}
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
