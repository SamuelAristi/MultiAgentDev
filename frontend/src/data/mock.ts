/**
 * Datos Mock para el Dashboard de 2B
 * Este archivo contiene la información de tiendas, agentes y bases de conocimiento
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface Store {
  id: string;
  name: string;
  description: string;
  color: string; // Color accent para la tienda
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  isActive: boolean; // Si el agente está disponible para usar
}

export interface KnowledgeBase {
  summary: string;
  bullets: string[];
  tone: string;
  targetAudience: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ============================================================================
// TIENDAS
// ============================================================================

export const stores: Store[] = [
  {
    id: "snatched",
    name: "Snatched",
    description: "Fajas y shapewear premium",
    color: "#a855f7", // purple-500
  },
  {
    id: "sonryse",
    name: "Sonryse",
    description: "Fajas post-quirúrgicas colombianas",
    color: "#ec4899", // pink-500
  },
  {
    id: "salome",
    name: "Salomé",
    description: "Fajas de alta compresión",
    color: "#8b5cf6", // violet-500
  },
];

// ============================================================================
// AGENTES
// ============================================================================

export const agents: Agent[] = [
  {
    id: "agent-copy",
    name: "Agent Copy",
    role: "Copywriting",
    description: "Genera copies y variantes para anuncios y tiendas",
    icon: "✍️",
    isActive: true,
  },
  {
    id: "agent-ads",
    name: "Agent ADS",
    role: "Advertising",
    description: "Crea y optimiza campañas publicitarias en múltiples plataformas",
    icon: "📢",
    isActive: false,
  },
  {
    id: "agent-apelaciones",
    name: "Agent Apelaciones",
    role: "Appeals",
    description: "Redacta apelaciones y respuestas para plataformas de e-commerce",
    icon: "⚖️",
    isActive: false,
  },
];

// ============================================================================
// BASES DE CONOCIMIENTO POR TIENDA
// ============================================================================

export const knowledgeBases: Record<string, KnowledgeBase> = {
  snatched: {
    summary: "Marca de shapewear premium enfocada en realzar la figura femenina con comodidad y estilo.",
    bullets: [
      "Fajas modeladoras de uso diario",
      "Tecnología de compresión gradual",
      "Diseños invisibles bajo la ropa",
      "Tallas XS a 3XL",
      "Envío gratis en pedidos +$50",
    ],
    tone: "Empoderador, moderno, aspiracional",
    targetAudience: "Mujeres 25-45 años que buscan verse y sentirse seguras",
  },
  sonryse: {
    summary: "Especialistas en fajas post-quirúrgicas colombianas con certificación médica.",
    bullets: [
      "Fajas post-operatorias certificadas",
      "Recomendadas por cirujanos plásticos",
      "Compresión médica Stage 1 y Stage 2",
      "Materiales hipoalergénicos",
      "Guía de tallas especializada",
    ],
    tone: "Profesional, confiable, experto médico",
    targetAudience: "Mujeres post-cirugía y profesionales médicos",
  },
  salome: {
    summary: "Fajas colombianas de alta compresión con tradición y calidad artesanal.",
    bullets: [
      "Fabricación 100% colombiana",
      "Alta compresión para resultados visibles",
      "Costuras reforzadas y duraderas",
      "Diseños clásicos y modernos",
      "Más de 20 años de experiencia",
    ],
    tone: "Tradicional, auténtico, resultados garantizados",
    targetAudience: "Mujeres que buscan fajas de compresión efectiva",
  },
};

// ============================================================================
// RESPUESTAS MOCK DEL AGENTE
// ============================================================================

/**
 * Genera una respuesta mock personalizada según la tienda y el mensaje del usuario
 */
export function generateMockResponse(storeId: string, userMessage: string): string {
  const kb = knowledgeBases[storeId] || knowledgeBases.snatched;
  const store = stores.find((s) => s.id === storeId) || stores[0];
  const msg = userMessage.toLowerCase();

  // Respuestas contextualizadas por tipo de solicitud
  if (msg.includes("hook") || msg.includes("gancho")) {
    return `🎯 **Hooks para ${store.name}**

**Hook 1 (Problema/Solución):**
"¿Cansada de fajas incómodas que se notan bajo la ropa?"

**Hook 2 (Curiosidad):**
"El secreto de las colombianas para una figura perfecta..."

**Hook 3 (Urgencia):**
"Solo esta semana: ${kb.bullets[4] || 'Oferta especial'}"

**Hook 4 (Prueba social):**
"Más de 10,000 mujeres ya transformaron su silueta con ${store.name}"

💡 *Tono recomendado: ${kb.tone}*`;
  }

  if (msg.includes("descripción") || msg.includes("descripcion") || msg.includes("producto")) {
    return `📝 **Descripción de Producto para ${store.name}**

${kb.summary}

**Características destacadas:**
${kb.bullets.map((b) => `• ${b}`).join("\n")}

**Copy sugerido:**
"Descubre la faja perfecta que ${store.name} diseñó pensando en ti. ${kb.bullets[0]}, con la calidad que mereces. ${kb.bullets[2]}. ¡Tu mejor versión te espera!"

🎯 *Audiencia objetivo: ${kb.targetAudience}*`;
  }

  if (msg.includes("anuncio") || msg.includes("ad") || msg.includes("publicidad")) {
    return `📣 **Copy para Anuncio - ${store.name}**

**Headline Principal:**
"Tu figura, tu confianza, tu ${store.name}"

**Copy Primario:**
${kb.summary}

**Variante A (Emocional):**
"Imagina verte al espejo y amar lo que ves. Con ${store.name}, cada día es una oportunidad para brillar. ${kb.bullets[0]}."

**Variante B (Beneficios):**
"✅ ${kb.bullets[0]}
✅ ${kb.bullets[1]}
✅ ${kb.bullets[2]}
¡Haz tu pedido hoy!"

**CTA sugeridos:**
• "Comprar ahora"
• "Ver colección"
• "Encuentra tu talla"`;
  }

  if (msg.includes("email") || msg.includes("correo")) {
    return `✉️ **Email Marketing - ${store.name}**

**Asunto:** Tu figura perfecta está a un clic ✨

**Preview:** ${kb.bullets[0]} - Descubre nuestra colección

---

Hola [Nombre],

${kb.summary}

Lo que nos hace especiales:
${kb.bullets.slice(0, 3).map((b) => `→ ${b}`).join("\n")}

[BOTÓN: Ver Colección]

Con cariño,
El equipo de ${store.name}

---
*${kb.bullets[4] || "Envío gratis disponible"}*`;
  }

  // Respuesta genérica
  return `¡Hola! Soy el Agent Copy de **${store.name}**.

📋 **Contexto de la marca:**
${kb.summary}

Puedo ayudarte a crear:
• 🎯 Hooks y ganchos para anuncios
• 📝 Descripciones de producto
• 📣 Copy para publicidad
• ✉️ Emails de marketing
• 📱 Contenido para redes sociales

**Ejemplo rápido para ${store.name}:**
"${kb.bullets[0]} - La calidad que tu cuerpo merece."

¿Qué tipo de copy necesitas hoy?`;
}

/**
 * Mensajes de bienvenida del agente según la tienda
 */
export function getWelcomeMessages(storeId: string): string[] {
  const store = stores.find((s) => s.id === storeId) || stores[0];
  const kb = knowledgeBases[storeId] || knowledgeBases.snatched;

  return [
    `¡Hola! Soy el **Agent Copy** especializado en **${store.name}**.

Mi base de conocimiento incluye:
• ${kb.bullets[0]}
• ${kb.bullets[1]}
• ${kb.bullets[2]}

Tono de marca: *${kb.tone}*

¿En qué puedo ayudarte hoy? Puedes pedirme:
- "Crea hooks para un anuncio"
- "Escribe una descripción de producto"
- "Genera copy para Facebook Ads"`,
  ];
}

// ============================================================================
// HELPERS
// ============================================================================

export function getStoreById(storeId: string): Store | undefined {
  return stores.find((s) => s.id === storeId);
}

export function getKnowledgeBase(storeId: string): KnowledgeBase | undefined {
  return knowledgeBases[storeId];
}

export function getAgentById(agentId: string): Agent | undefined {
  return agents.find((a) => a.id === agentId);
}

export function isValidStoreId(storeId: string): boolean {
  return stores.some((s) => s.id === storeId);
}
