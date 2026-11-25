/**
 * The ArchiMate 3.2 elements modux has no concept of its own for. They are documentation only —
 * stored as `archimateElements` (one file each), drawn in the Archi notation, related to anything
 * through generic ArchiMate relations, and they generate no code. With them a view can describe
 * any system, not only the parts modux builds: the database a service leans on, the topic events
 * travel through, the business process a use case supports, the node it runs on.
 *
 * A node of one of these is drawn with kind `am:<Concept>` (e.g. `am:SystemSoftware`), so the
 * relation matrix (keyed by Archi's concept names) applies to it as is.
 */

export type ArchimateLayer =
  | 'business' | 'application' | 'technology' | 'physical'
  | 'motivation' | 'strategy' | 'implementation' | 'other';

export interface ArchimateConcept {
  /** Archi's concept name — what the model stores and the relation matrix is keyed by. */
  concept: string;
  layer: ArchimateLayer;
  /** Glyph key in the canvas SYMBOLS. */
  symbol: string;
  /** Behaviour (and strategy/implementation behaviour) is drawn with rounded corners. */
  rounded?: boolean;
  en: string;
  es: string;
}

/** Archi's default fill per layer. */
export const ARCHIMATE_LAYER_FILL: Record<ArchimateLayer, string> = {
  business: '#FFFFB5',
  application: '#B5FFFF',
  technology: '#C9E7B7',
  physical: '#C9E7B7',
  motivation: '#CCCCFF',
  strategy: '#F5DEAA',
  implementation: '#FFE0E0',
  other: '#FBB875',
};

// BusinessActor is left out on purpose: modux's own Actor is that concept.
export const ARCHIMATE_CONCEPTS: ArchimateConcept[] = [
  // Business
  { concept: 'BusinessRole', layer: 'business', symbol: 'amx-role', en: 'Business role', es: 'Rol de negocio' },
  { concept: 'BusinessCollaboration', layer: 'business', symbol: 'amx-collaboration', en: 'Business collaboration', es: 'Colaboración de negocio' },
  { concept: 'BusinessInterface', layer: 'business', symbol: 'interface', en: 'Business interface', es: 'Interfaz de negocio' },
  { concept: 'BusinessProcess', layer: 'business', symbol: 'process', rounded: true, en: 'Business process', es: 'Proceso de negocio' },
  { concept: 'BusinessFunction', layer: 'business', symbol: 'am-function', rounded: true, en: 'Business function', es: 'Función de negocio' },
  { concept: 'BusinessInteraction', layer: 'business', symbol: 'amx-interaction', rounded: true, en: 'Business interaction', es: 'Interacción de negocio' },
  { concept: 'BusinessEvent', layer: 'business', symbol: 'am-event', rounded: true, en: 'Business event', es: 'Evento de negocio' },
  { concept: 'BusinessService', layer: 'business', symbol: 'am-service', rounded: true, en: 'Business service', es: 'Servicio de negocio' },
  { concept: 'BusinessObject', layer: 'business', symbol: 'am-object', en: 'Business object', es: 'Objeto de negocio' },
  { concept: 'Contract', layer: 'business', symbol: 'amx-contract', en: 'Contract', es: 'Contrato' },
  { concept: 'Representation', layer: 'business', symbol: 'amx-representation', en: 'Representation', es: 'Representación' },
  { concept: 'Product', layer: 'business', symbol: 'amx-product', en: 'Product', es: 'Producto' },
  // Application
  { concept: 'ApplicationComponent', layer: 'application', symbol: 'am-component', en: 'Application component', es: 'Componente de aplicación' },
  { concept: 'ApplicationCollaboration', layer: 'application', symbol: 'amx-collaboration', en: 'Application collaboration', es: 'Colaboración de aplicación' },
  { concept: 'ApplicationInterface', layer: 'application', symbol: 'interface', en: 'Application interface', es: 'Interfaz de aplicación' },
  { concept: 'ApplicationFunction', layer: 'application', symbol: 'am-function', rounded: true, en: 'Application function', es: 'Función de aplicación' },
  { concept: 'ApplicationInteraction', layer: 'application', symbol: 'amx-interaction', rounded: true, en: 'Application interaction', es: 'Interacción de aplicación' },
  { concept: 'ApplicationProcess', layer: 'application', symbol: 'process', rounded: true, en: 'Application process', es: 'Proceso de aplicación' },
  { concept: 'ApplicationEvent', layer: 'application', symbol: 'am-event', rounded: true, en: 'Application event', es: 'Evento de aplicación' },
  { concept: 'ApplicationService', layer: 'application', symbol: 'am-service', rounded: true, en: 'Application service', es: 'Servicio de aplicación' },
  { concept: 'DataObject', layer: 'application', symbol: 'am-object', en: 'Data object', es: 'Objeto de datos' },
  // Technology
  { concept: 'Node', layer: 'technology', symbol: 'amx-node', en: 'Node', es: 'Nodo' },
  { concept: 'Device', layer: 'technology', symbol: 'amx-device', en: 'Device', es: 'Dispositivo' },
  { concept: 'SystemSoftware', layer: 'technology', symbol: 'amx-system-software', en: 'System software', es: 'Software de sistema' },
  { concept: 'TechnologyCollaboration', layer: 'technology', symbol: 'amx-collaboration', en: 'Technology collaboration', es: 'Colaboración tecnológica' },
  { concept: 'TechnologyInterface', layer: 'technology', symbol: 'interface', en: 'Technology interface', es: 'Interfaz tecnológica' },
  { concept: 'Path', layer: 'technology', symbol: 'amx-path', en: 'Path', es: 'Ruta' },
  { concept: 'CommunicationNetwork', layer: 'technology', symbol: 'amx-network', en: 'Communication network', es: 'Red de comunicación' },
  { concept: 'TechnologyFunction', layer: 'technology', symbol: 'am-function', rounded: true, en: 'Technology function', es: 'Función tecnológica' },
  { concept: 'TechnologyProcess', layer: 'technology', symbol: 'process', rounded: true, en: 'Technology process', es: 'Proceso tecnológico' },
  { concept: 'TechnologyInteraction', layer: 'technology', symbol: 'amx-interaction', rounded: true, en: 'Technology interaction', es: 'Interacción tecnológica' },
  { concept: 'TechnologyEvent', layer: 'technology', symbol: 'am-event', rounded: true, en: 'Technology event', es: 'Evento tecnológico' },
  { concept: 'TechnologyService', layer: 'technology', symbol: 'am-service', rounded: true, en: 'Technology service', es: 'Servicio tecnológico' },
  { concept: 'Artifact', layer: 'technology', symbol: 'amx-artifact', en: 'Artifact', es: 'Artefacto' },
  // Physical
  { concept: 'Equipment', layer: 'physical', symbol: 'gear', en: 'Equipment', es: 'Equipo' },
  { concept: 'Facility', layer: 'physical', symbol: 'amx-facility', en: 'Facility', es: 'Instalación' },
  { concept: 'DistributionNetwork', layer: 'physical', symbol: 'amx-distribution', en: 'Distribution network', es: 'Red de distribución' },
  { concept: 'Material', layer: 'physical', symbol: 'amx-material', en: 'Material', es: 'Material' },
  // Motivation
  { concept: 'Stakeholder', layer: 'motivation', symbol: 'amx-role', en: 'Stakeholder', es: 'Parte interesada' },
  { concept: 'Driver', layer: 'motivation', symbol: 'amx-driver', en: 'Driver', es: 'Impulsor' },
  { concept: 'Assessment', layer: 'motivation', symbol: 'lens', en: 'Assessment', es: 'Evaluación' },
  { concept: 'Goal', layer: 'motivation', symbol: 'amx-goal', en: 'Goal', es: 'Meta' },
  { concept: 'Outcome', layer: 'motivation', symbol: 'amx-outcome', en: 'Outcome', es: 'Resultado' },
  { concept: 'Principle', layer: 'motivation', symbol: 'amx-principle', en: 'Principle', es: 'Principio' },
  { concept: 'Requirement', layer: 'motivation', symbol: 'amx-requirement', en: 'Requirement', es: 'Requisito' },
  { concept: 'Constraint', layer: 'motivation', symbol: 'amx-constraint', en: 'Constraint', es: 'Restricción' },
  { concept: 'Meaning', layer: 'motivation', symbol: 'amx-meaning', en: 'Meaning', es: 'Significado' },
  { concept: 'Value', layer: 'motivation', symbol: 'amx-value', en: 'Value', es: 'Valor' },
  // Strategy
  { concept: 'Resource', layer: 'strategy', symbol: 'amx-resource', en: 'Resource', es: 'Recurso' },
  { concept: 'Capability', layer: 'strategy', symbol: 'amx-capability', rounded: true, en: 'Capability', es: 'Capacidad' },
  { concept: 'ValueStream', layer: 'strategy', symbol: 'amx-value-stream', rounded: true, en: 'Value stream', es: 'Flujo de valor' },
  { concept: 'CourseOfAction', layer: 'strategy', symbol: 'amx-course', rounded: true, en: 'Course of action', es: 'Curso de acción' },
  // Implementation & migration
  { concept: 'WorkPackage', layer: 'implementation', symbol: 'undo', rounded: true, en: 'Work package', es: 'Paquete de trabajo' },
  { concept: 'Deliverable', layer: 'implementation', symbol: 'amx-deliverable', en: 'Deliverable', es: 'Entregable' },
  { concept: 'ImplementationEvent', layer: 'implementation', symbol: 'am-event', rounded: true, en: 'Implementation event', es: 'Evento de implantación' },
  { concept: 'Plateau', layer: 'implementation', symbol: 'amx-plateau', en: 'Plateau', es: 'Meseta' },
  { concept: 'Gap', layer: 'implementation', symbol: 'amx-gap', en: 'Gap', es: 'Brecha' },
  // Other
  { concept: 'Location', layer: 'other', symbol: 'amx-location', en: 'Location', es: 'Ubicación' },
];

const BY_CONCEPT = new Map(ARCHIMATE_CONCEPTS.map((c) => [c.concept, c]));

/** The node kind an ArchiMate element is drawn as. */
export const archimateKind = (concept: string): string => `am:${concept}`;

/** The concept behind an `am:<Concept>` node kind, or null for any other kind. */
export function conceptOfKind(kind: string): string | null {
  return kind.startsWith('am:') ? kind.slice(3) : null;
}

export function archimateConcept(conceptOrKind: string): ArchimateConcept | undefined {
  return BY_CONCEPT.get(conceptOfKind(conceptOrKind) ?? conceptOrKind);
}

/** The concept's display name in the given UI language. */
export function conceptLabel(conceptOrKind: string, lang: string): string {
  const c = archimateConcept(conceptOrKind);
  if (!c) return conceptOfKind(conceptOrKind) ?? conceptOrKind;
  return lang.startsWith('es') ? c.es : c.en;
}

/** Fill of an ArchiMate element node — its layer's colour in Archi. */
export function archimateFill(conceptOrKind: string): string {
  const c = archimateConcept(conceptOrKind);
  return ARCHIMATE_LAYER_FILL[c?.layer ?? 'other'];
}
