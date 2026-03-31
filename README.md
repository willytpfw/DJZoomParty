Estas preocupado por la música que vas a poner en tu evento?


Usa AppEvent

Agrega un evento.
Define hora y lugar.
Decide si vas a crear una lista de reproducción.
Invita a tus amigos a que se unan agreguen y voten la música que les gustaría escuchar.
Reproduce la lista y escucha la música que tuvo mas votos.
Así todos contentos a disfrutar de la fiesta.

🖥️ Frontend		
Tecnología	Versión	Uso
React	^19.0.0	Framework UI principal
React Router DOM	^7.1.0	Navegación SPA
TypeScript	~5.6.2	Tipado estático
Vite	^6.0.5	Bundler / dev server (:5173)
Tailwind CSS	^3.4.17	Estilos utilitarios
i18next + react-i18next	^25 / ^16	Internacionalización (ES + EN)
Lucide React	^0.468.0	Iconos SVG
qrcode.react	^4.2.0	Generación de QR
date-fns / date-fns-tz	^4.1 / ^3.2	Fechas y zonas horarias
		
		
⚙️ Backend		
Tecnología	Versión	Uso
Node.js	20 Alpine	Runtime
Express	^4.21.0	API REST
TypeScript + tsx	~5.6 / ^4.19	Ejecución TS sin compilar en dev
Drizzle ORM	^0.38.0	ORM type-safe
Drizzle Kit	^0.30.0	Migraciones / schema push
PostgreSQL (pg)	^8.13.0	Driver de BD
jose	^5.9.0	JWT/JWS para tokens de acceso
googleapis	^171.4.0	YouTube Data API v3 + OAuth2
Twilio	^5.4.0	SMS para verificación PIN
cors / dotenv	^2.8 / ^16.4	CORS y variables de entorno
		
		
🗄️ Base 		
PostgreSQL 15 (Alpine) con 8 tablas: user, company, event, event_music, user_login, user_company, app_request, error		
		
🔌 Servicios Externos		
Servicio	Uso	
YouTube Data API v3	Búsqueda, playlists y videos	
YouTube OAuth2	Auth para gestión del canal	
Twilio	Envío de PIN por SMS	
		
🐳 Infraestructura		
Docker + Docker Compose — app en :3001 + PostgreSQL en :5432		
Multi-stage Dockerfile basado en Node 20 Alpine		
En producción Express sirve el SPA desde dist/ (sin Nginx)		
<img width="1024" height="1434" alt="image" src="https://github.com/user-attachments/assets/466799f9-ce84-41a1-8bda-8e92f58843b7" />

