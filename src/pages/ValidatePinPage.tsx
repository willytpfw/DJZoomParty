import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ValidatePinPage() {
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token');

    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8">
                <div className="glass-card p-8 max-w-md w-full text-center fade-in">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                    <h1 className="text-2xl font-orbitron font-bold mb-4 text-red-400">Error</h1>
                    <p className="text-gray-300 mb-6">No se proporcionó token de validación. Usa el enlace que enviamos a tu correo.</p>
                </div>
            </div>
        );
    }

    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!pin.trim() || pin.length < 6) {
            setError('El PIN debe tener al menos 6 dígitos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/v1/auth/validate-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, pin }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'PIN incorrecto o expirado.');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Decorative Elements */}
            <div className="fixed top-10 left-10 opacity-20 hidden md:block">
                <div className="disco-ball" />
            </div>

            <div className="glass-card p-8 max-w-md w-full fade-in z-10">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-disco-purple/20 flex items-center justify-center">
                        {success ? (
                            <CheckCircle className="w-8 h-8 text-green-400" />
                        ) : (
                            <Lock className="w-8 h-8 text-disco-pink" />
                        )}
                    </div>
                    <h2 className="text-2xl font-orbitron font-bold mb-2 text-white">
                        Verificar PIN
                    </h2>
                    {!success && (
                        <p className="text-gray-400">
                            Ingresa el código que enviamos a tu móvil por SMS.
                        </p>
                    )}
                </div>

                {success ? (
                    <div className="text-center space-y-6">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400">
                            ¡Cuenta verificada y activada con éxito!
                        </div>
                        <p className="text-gray-300">
                            Te hemos enviado un correo electrónico con tu acceso a la aplicación.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleVerifyPin} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm text-gray-400 mb-2 text-center">
                                Código PIN
                            </label>
                            <input
                                type="text"
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 8))}
                                placeholder="******"
                                className="input-neon text-center text-3xl tracking-[1em] font-mono py-4"
                                maxLength={8}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || pin.length < 6}
                            className="btn-neon btn-neon-pink w-full flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verificando...
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5" />
                                    Validar PIN
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
