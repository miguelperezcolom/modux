/** Messages of the hosts area. Keys are prefixed with 'hosts.'; `es` must have exactly the keys of `en`. */
export const en = {
  'hosts.loadingModel': 'Loading the model…',

  // modux-editor-connected (web app, REST)
  'hosts.connected.reloadedExternally': 'The model changed outside this editor: reloaded (undo history reset)',
  'hosts.connected.commandRejected': 'The server rejected the command ({status})',

  // modux-editor-ide / modux-archi-ide (IDE plugin)
  'hosts.ide.noBridge': 'No bridge to the IDE: this component only works inside the plugin.',
  'hosts.ide.noBridgeShort': 'No bridge to the IDE',
  'hosts.ide.openViewFailed': 'Could not open the view: {message}',
  'hosts.ide.saveFailed': 'Could not save: {message}',
  'hosts.ide.applyFailed': 'Could not apply: {message}',
  'hosts.ide.unprojectedTypes': 'This model has elements the editor does not draw yet: {types}. They are kept intact on disk.',
  'hosts.ide.referencedModelNotFound': 'Cannot find the model of {project}. Clone it next to this repository, or give the reference a path.',
  'hosts.ideFs.readOnlyReference': "Another project's model is read-only",

  // draw.io host
  'hosts.drawio.noBridge': 'No bridge to the IDE (window.moduxBridge missing).',
  'hosts.drawio.openModelFailed': 'Could not open the model: {message}',

  // default names written into the model (in the UI language)
  'hosts.default.project': 'project',
} satisfies Record<`hosts.${string}`, string>;

export const es: Record<keyof typeof en, string> = {
  'hosts.loadingModel': 'Cargando el modelo…',

  'hosts.connected.reloadedExternally': 'El modelo ha cambiado fuera de este editor: recargado (historial de deshacer reiniciado)',
  'hosts.connected.commandRejected': 'El servidor rechazó el comando ({status})',

  'hosts.ide.noBridge': 'Sin puente con el IDE: este componente solo funciona dentro del plugin.',
  'hosts.ide.noBridgeShort': 'Sin puente con el IDE',
  'hosts.ide.openViewFailed': 'No se pudo abrir la vista: {message}',
  'hosts.ide.saveFailed': 'No se pudo guardar: {message}',
  'hosts.ide.applyFailed': 'No se pudo aplicar: {message}',
  'hosts.ide.unprojectedTypes': 'Este modelo tiene elementos que el editor todavía no dibuja: {types}. Se conservan intactos en disco.',
  'hosts.ide.referencedModelNotFound': 'No encuentro el modelo de {project}. Clónalo al lado de este repositorio, o dale un path a la referencia.',
  'hosts.ideFs.readOnlyReference': 'El modelo de otro proyecto se lee, no se escribe',

  'hosts.drawio.noBridge': 'Sin puente con el IDE (window.moduxBridge ausente).',
  'hosts.drawio.openModelFailed': 'No se pudo abrir el modelo: {message}',

  'hosts.default.project': 'proyecto',
};
