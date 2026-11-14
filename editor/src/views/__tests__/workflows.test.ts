import { describe, it, expect } from 'vitest';
import { setLanguage } from '../../i18n/index.js';
import { workflowsScene } from '../workflows.js';
import { baseModel } from './fixtures.js';

// The scenes below are built while the suite is collected (before any hook runs), so the
// language is set at import time.
setLanguage('es');

const wfModel = () =>
  baseModel({
    workflows: [
      {
        id: 'wf-alta',
        name: 'Alta',
        onCompletionEventName: 'AltaDone',
        steps: [
          { id: 's1', name: 'Validar', targetUseCaseId: 'uc-validar' },
          {
            id: 's2',
            name: 'Aprobar',
            roleId: 'backoffice',
            deadline: 'PT48H',
            formPageId: 'page-aprobar',
            dependsOnStepIds: ['s1'],
          },
        ],
      },
    ],
    pages: [{ id: 'page-aprobar', name: 'Aprobación' }],
    workflowGateways: [
      {
        id: 'sp1',
        name: 'Split 1',
        type: 'SPLIT',
        semantics: 'EXCLUSIVE',
        sourceIds: ['s1'],
        targetIds: ['s2'],
        branchConditions: [],
      },
    ],
  });

describe('workflowsScene', () => {
  const scene = workflowsScene(wfModel(), {}, new Set(), true);

  it('folded by default: steps hide, their edges roll up to the workflow (Archi style)', () => {
    const folded = workflowsScene(wfModel(), {});
    const wf = folded.nodes.find((n) => n.id === 'wf-alta')!;
    expect(wf.collapsible).toBe(true);
    expect(wf.collapsed).toBe(true);
    expect(folded.nodes.some((n) => n.kind === 'workflow-step')).toBe(false);
    // no edge dangles from a hidden step
    const staged = new Set(folded.nodes.map((n) => n.id));
    expect(folded.edges.every((e) => staged.has(e.sourceId) && staged.has(e.targetId))).toBe(true);
  });

  it('expanded: steps are free boxes owned by their workflow', () => {
    const step = scene.nodes.find((n) => n.kind === 'workflow-step')!;
    expect(step.parentId).toBeUndefined();
    expect(step.ownerId).toBe('wf-alta');
  });

  it('draws the workflow, its steps and the completion event', () => {
    const ids = scene.nodes.map((n) => n.id);
    expect(ids).toContain('wf-alta');
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
    expect(ids).toContain('done:wf-alta');
  });

  it('marks the human step: actor symbol, role badge, form flag', () => {
    const s2 = scene.nodes.find((n) => n.id === 's2')!;
    expect(s2.symbol).toBe('actor');
    expect(s2.badge).toContain('backoffice');
    expect(s2.badge).toContain('📋');
    expect(s2.badge).toContain('PT48H');
  });

  it('hangs the form page off the human step (wf-form edge)', () => {
    const form = scene.nodes.find((n) => n.id === 'page-aprobar')!;
    expect(form.badge).toContain('FORMULARIO');
    const edge = scene.edges.find((e) => e.kind === 'wf-form')!;
    expect(edge.id).toBe('wfform:s2->page-aprobar');
    expect(edge.sourceId).toBe('s2');
    expect(edge.targetId).toBe('page-aprobar');
  });

  it('wires the dependency graph: root from the workflow, dependents between steps', () => {
    expect(scene.edges.some((e) => e.kind === 'workflow-start' && e.targetId === 's1')).toBe(true);
    expect(
      scene.edges.some((e) => e.kind === 'workflow-dependency' && e.sourceId === 's1' && e.targetId === 's2'),
    ).toBe(true);
  });

  it('completes from the sinks only', () => {
    const completions = scene.edges.filter((e) => e.kind === 'workflow-completion');
    expect(completions.map((e) => e.sourceId)).toEqual(['s2']);
  });

  it('draws the loose exclusive split with its unguarded branch flagged', () => {
    const g = scene.nodes.find((n) => n.id === 'sp1')!;
    expect(g.badge).toContain('EXCLUSIVO');
    const out = scene.edges.find((e) => e.id === 'wflink:sp1->s2')!;
    expect(out.label).toBe('¿condición?');
    expect(out.dashed).toBe(true);
  });

  it('labels the guarded branch with its condition', () => {
    const m = wfModel();
    m.workflowGateways![0].branchConditions = [{ targetId: 's2', expression: 'importe > 1000' }];
    const s = workflowsScene(m, {}, new Set(), true);
    const out = s.edges.find((e) => e.id === 'wflink:sp1->s2')!;
    expect(out.label).toBe('importe > 1000');
    expect(out.dashed).toBeFalsy();
  });

  it('draws the hand-off when a step delivers to ANOTHER workflow', () => {
    const m = wfModel();
    m.workflows!.push({ id: 'wf-b', name: 'B', steps: [] });
    m.workflows![0].steps[1].handoffWorkflowId = 'wf-b';
    const s = workflowsScene(m, {}, new Set(), true);
    expect(s.edges.some((e) => e.kind === 'wf-link' && e.id === 'wflink:s2->wf-b')).toBe(true);
  });
});
