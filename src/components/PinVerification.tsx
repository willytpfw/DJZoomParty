import { useState } from 'react';
import { Send, Loader2, Smartphone, Lock } from 'lucide-react';

interface PinVerificationProps {
    userName: string;
    keyCompany: string;
    onVerified: (token: string) => void;
}

export default function PinVerification({ userName, keyCompany, onVerified }: PinVerificationProps) {
    const [step, setStep] = useState<'send' | 'verify'>('send');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [smsSent, setSmsSent] = useState(false);

    const handleSendPin = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/send-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName }),
            });

            const data = await response.json();

            if (data.success) {
                setSmsSent(true);
                setStep('verify');
                // In dev mode, show the PIN in console
                if (data.pin) {
                    console.log('Development mode - PIN:', data.pin);
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Error al enviar el PIN');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPin = async () => {
        if (!pin.trim() || pin.length < 6) {
            setError('El PIN debe tener al menos 6 dígitos');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userName, pin, keyCompany }),
            });

            const data = await response.json();

            if (data.success) {
                onVerified(data.token);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Error al verificar el PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-8">
            <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-disco-purple/20 flex items-center justify-center">
                    {step === 'send' ? (
                        <Smartphone className="w-8 h-8 text-disco-purple" />
                    ) : (
                        <Lock className="w-8 h-8 text-disco-pink" />
                    )}
                </div>
                <h2 className="text-2xl font-orbitron font-bold mb-2">
                    Verificación de Acceso
                </h2>
                <p className="text-gray-400">
                    {step === 'send'
                        ? 'Te enviaremos un código PIN a tu móvil'
                        : 'Ingresa el código PIN que recibiste'
                    }
                </p>
            </div>

            {/* User Info */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-400">Usuario</p>
                <p className="font-semibold text-lg">{userName}</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {step === 'send' ? (
                /* Send PIN Step */
                <button
                    onClick={handleSendPin}
                    disabled={loading}
                    className="btn-neon w-full flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            Enviar Código PIN
                        </>
                    )}
                </button>
            ) : (
                /* Verify PIN Step */
                <div className="space-y-4">
                    {smsSent && (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
                            ✓ Se ha enviado un código PIN a tu móvil
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-400 mb-2">
                            Código PIN
                        </label>
                        <input
                            type="text"
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').substring(0, 8))}
                            placeholder="Ingresa el código de 6 dígitos"
                            className="input-neon text-center text-2xl tracking-widest font-mono"
                            maxLength={8}
                        />
                    </div>

                    <button
                        onClick={handleVerifyPin}
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
                                Verificar PIN
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSendPin}
                        disabled={loading}
                        className="w-full text-center text-gray-400 hover:text-white transition text-sm"
                    >
                        ¿No recibiste el código? Reenviar
                    </button>
                </div>
            )}
        </div>
    );
}
