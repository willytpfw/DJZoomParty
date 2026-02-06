import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface QRCodeModalProps {
    url: string;
    eventToken: string;
    onClose: () => void;
}

export default function QRCodeModal({ url, eventToken, onClose }: QRCodeModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            alert('Error al copiar URL');
        }
    };

    const handleDownloadQR = () => {
        const svg = document.querySelector('#qr-code svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `evento-${eventToken}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-card w-full max-w-md p-6 fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-orbitron font-bold neon-text-cyan">
                        Código QR
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* QR Code */}
                <div id="qr-code" className="qr-container mx-auto mb-6">
                    <QRCodeSVG
                        value={url}
                        size={256}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#000000"
                    />
                </div>

                {/* Event Token */}
                <div className="text-center mb-6">
                    <p className="text-sm text-gray-400 mb-1">Token del Evento</p>
                    <p className="font-mono text-lg text-disco-purple">{eventToken}</p>
                </div>

                {/* URL */}
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-400 mb-2">URL del Evento</p>
                    <p className="text-xs break-all text-gray-300">{url}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleCopyUrl}
                        className="flex-1 btn-neon flex items-center justify-center gap-2"
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5" />
                                ¡Copiado!
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                Copiar URL
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleDownloadQR}
                        className="flex-1 btn-neon btn-neon-pink flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Descargar
                    </button>
                </div>
            </div>
        </div>
    );
}
