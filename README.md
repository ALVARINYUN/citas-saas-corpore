# Citas SaaS — Fase 1: Agendamiento multi-negocio

## Qué incluye esta fase
- Esquema de base de datos completo (`prisma/schema.prisma`): negocios, staff, servicios,
  horarios, clientes, citas, y ya está preparado el modelo para conectar redes sociales
  y campañas de publicidad (Fase 3-4).
- Lógica de disponibilidad (`src/lib/availability.ts`): calcula horarios libres cruzando
  el horario de cada empleado con las citas ya existentes.
- API pública:
  - `GET /api/business/[slug]/services` — lista los servicios de un negocio
  - `GET /api/business/[slug]/availability?serviceId=...&date=YYYY-MM-DD` — horarios libres
  - `POST /api/appointments` — crea una cita (con validación anti-doble-reserva)
- Página pública de agendamiento en `/b/[slug]` — lo que ve el cliente final.

## Cómo correrlo en tu máquina

1. Instala dependencias:
   ```
   npm install
   ```

2. Configura tu base de datos. Copia `.env.local.example` a `.env` y pon tu URL real
   de PostgreSQL (puedes usar Neon o Supabase gratis para empezar):
   ```
   DATABASE_URL="postgresql://usuario:password@host:5432/citas_saas"
   ```

3. Genera el cliente de Prisma y crea las tablas:
   ```
   npx prisma generate
   npx prisma db push
   ```
   > Nota: en el entorno donde generé este código no tenía acceso de red a los
   > binarios de Prisma, así que no pude correr `generate` aquí. Es el primer
   > comando que debes correr tú al bajar el proyecto.

4. Levanta el servidor:
   ```
   npm run dev
   ```

5. Crea un negocio de prueba directamente en la base de datos (más adelante
   construimos el panel de administración para hacer esto desde la interfaz)
   usando Prisma Studio:
   ```
   npx prisma studio
   ```

## Mobile
La página pública (`/b/[slug]`) está hecha mobile-first: botones grandes para
dedo, inputs que no disparan zoom en iOS, y layout de una sola columna que se
ve bien en cualquier celular. No necesitas una app aparte — es una página web
que funciona perfecto desde el navegador del teléfono. Si más adelante quieres
que se pueda "instalar" en la pantalla de inicio como una app (PWA), es un
paso adicional sencillo que podemos agregar.

## WhatsApp — confirmaciones automáticas de citas
Cuando un cliente agenda, el sistema le envía automáticamente un mensaje de
confirmación por WhatsApp (`src/lib/whatsapp.ts`), usando la **WhatsApp Cloud
API** oficial de Meta (la misma familia de APIs que Facebook/Instagram Ads).

Para activarlo:
1. En developers.facebook.com, dentro de tu app de Meta Business, agrega el
   producto "WhatsApp".
2. Meta te da un número de prueba gratis para empezar a probar de inmediato
   (para producción luego conectas tu número real de WhatsApp Business).
3. Copia el **access token** y el **Phone Number ID** a tu `.env`.
4. Crea una plantilla de mensaje en Meta Business Manager → Message Templates,
   llamada `confirmacion_cita`, con un cuerpo como:
   > "Hola {{1}}, tu cita para {{2}} quedó confirmada el {{3}}."
5. Espera la aprobación de Meta (usualmente minutos, a veces horas).

**Por qué se necesita una "plantilla" y no un mensaje normal**: WhatsApp solo
deja mandar texto libre si el cliente te escribió primero en las últimas 24
horas. Como aquí es el negocio quien inicia el mensaje (el cliente solo llenó
un formulario web, no escribió por WhatsApp), Meta exige usar una plantilla
pre-aprobada. Es una regla de la plataforma, no algo que podamos evitar.

Si el envío de WhatsApp falla por cualquier motivo (plantilla aún no
aprobada, número mal escrito, etc.), la cita se guarda igual — el mensaje
nunca bloquea el agendamiento.

## Chatbot de WhatsApp — agenda y cancela citas por chat
Además de mandar la confirmación, el sistema ahora puede sostener una
conversación completa por WhatsApp: el cliente escribe "agendar", el bot le
muestra los servicios, le pregunta la fecha, le muestra horarios libres, pide
el nombre y confirma — todo dentro de WhatsApp, sin que abra la página web.
También puede escribir "cancelar" y elegir cuál de sus citas próximas anular.

Piezas del sistema:
- `src/lib/whatsappBot.ts` — el "cerebro": interpreta el mensaje según en qué
  paso va la conversación (guardado en la tabla `WhatsAppConversation`).
- `src/app/api/whatsapp/webhook/route.ts` — el punto de entrada donde Meta
  envía cada mensaje que le llega a tu número de WhatsApp Business.

### Cómo conectarlo
1. Ya deberías tener el producto "WhatsApp" agregado a tu app de Meta
   (mismo paso que para las confirmaciones, ver sección anterior).
2. En tu `.env`, define `WHATSAPP_VERIFY_TOKEN` con cualquier palabra secreta
   que tú elijas.
3. Sube el proyecto a un hosting con URL pública (Vercel es lo más simple
   para Next.js).
4. En developers.facebook.com → tu app → WhatsApp → Configuration, en
   "Webhook" pon:
   - **Callback URL**: `https://tu-dominio.com/api/whatsapp/webhook`
   - **Verify token**: el mismo valor que pusiste en `WHATSAPP_VERIFY_TOKEN`
   - Suscríbete al campo `messages`
5. En tu base de datos, crea un registro en `SocialAccount` que conecte el
   `phone_number_id` de WhatsApp con el negocio correspondiente (esto lo
   harás desde el panel de administración cuando construyamos la Fase 2; por
   ahora se hace directo con Prisma Studio):
   ```
   platform: "WHATSAPP"
   accountId: "<tu phone_number_id de Meta>"
   businessId: "<id del negocio>"
   accessToken: "no se usa para webhook, pero el campo es obligatorio, pon cualquier valor"
   ```

Sin este último paso, el webhook recibe el mensaje pero no sabe a cuál
negocio pertenece (recuerda que el sistema es multi-negocio, así que cada
número de WhatsApp debe estar vinculado a un negocio específico).


- **Fase 2**: Panel de administración para que cada negocio configure sus
  servicios, staff y horarios desde la interfaz (ahora mismo solo existe el
  modelo de datos, se administra a mano vía Prisma Studio).
- **Fase 3**: Motor de generación de anuncios (texto + imagen/video).
- **Fase 4**: Integración con Meta Marketing API y TikTok Marketing API para
  publicar directamente. Necesitas tener aprobadas tus apps de desarrollador
  antes de que esta fase tenga efecto real.

## Sobre las cuentas de Meta y TikTok
Mientras avanzamos con las siguientes fases, ve tramitando:
- App de Meta Business + verificación de negocio en developers.facebook.com
- App de TikTok Marketing API en ads.tiktok.com/marketing_api

Sin esto, el sistema de publicidad puede generar los anuncios pero no podrá
publicarlos en las redes reales.
## Lo que falta (próximas fases)
- **Fase 2**: Panel de administración para que cada negocio configure sus
  servicios, staff y horarios desde la interfaz (ahora mismo se administra a
  mano vía Prisma Studio), y para conectar su número de WhatsApp sin tocar
  la base de datos directamente.
- **Fase 3**: Motor de generación de anuncios (texto + imagen/video).
- **Fase 4**: Integración con Meta Marketing API y TikTok Marketing API para
  publicar directamente. Necesitas tener aprobadas tus apps de desarrollador
  antes de que esta fase tenga efecto real.

## Sobre las cuentas de Meta y TikTok
Mientras avanzamos con las siguientes fases, ve tramitando:
- App de Meta Business + verificación de negocio en developers.facebook.com
- App de TikTok Marketing API en ads.tiktok.com/marketing_api

Sin esto, el sistema de publicidad puede generar los anuncios pero no podrá
publicarlos en las redes reales.
